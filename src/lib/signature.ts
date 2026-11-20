/**
 * Envoi d'un bail en signature via DocuSeal : création des demandes (bail et,
 * s'il y a un garant privé, acte de cautionnement), suivi en base, annulation.
 * Sans contrôle d'accès : l'appelant (Server Action web ou route mobile)
 * s'authentifie.
 */
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/portal-invite'
import { buildLeaseDocumentData, type LeaseDocumentData, type Signer } from '@/lib/lease-document'
import {
    DocusealError, docusealRequest, fetchTemplate, getDocusealConfig, type DocusealConfig, type TemplateInfo,
} from '@/lib/docuseal'
import { CATALOG_BY_KEY, type DocKind } from '@/lib/lease-catalog'
import { syncSignatureRequest, type RawSubmission } from '@/lib/signature-sync'

/** Erreur attendue (donnée manquante, template incomplet, demande déjà en cours…). */
export class SignatureError extends Error {
    constructor(message: string, readonly details: string[] = []) {
        super(message)
        this.name = 'SignatureError'
    }
}

export interface SignerLink {
    role: string
    name: string
    email: string
    link: string
}

export interface SentRequest {
    kind: DocKind
    submissionId: number
    signers: SignerLink[]
}

export interface SendResult {
    requests: SentRequest[]
    warnings: string[]
}

interface DocusealSubmitterResponse {
    id: number
    slug: string
    submission_id: number
    role: string
    email: string
    name: string | null
    embed_src?: string
    status?: string
}

const KIND_LABEL: Record<DocKind, string> = { BAIL: 'le bail', CAUTION: "l'acte de cautionnement" }

// Un seul processus : un verrou mémoire suffit contre les doubles clics.
const sending = new Set<string>()

function submittersPayload(doc: DocKind, signers: Signer[], template: TemplateInfo, values: LeaseDocumentData['values'], leaseId: string, notify: boolean) {
    const roles = new Set(template.roles)
    for (const s of signers) {
        if (!roles.has(s.role)) {
            throw new SignatureError(
                `Le template « ${template.name} » n'a pas de rôle « ${s.role} » : ajoutez-le dans DocuSeal${s.role === 'Caution' || s.role === 'Colocataire' ? ' ou retirez cette personne du bail' : ''}.`,
            )
        }
    }
    return signers.map(s => {
        // Chaque valeur part dans le signataire du rôle propriétaire du champ (sinon DocuSeal répond 422).
        const seen = new Set<string>()
        const fields: { name: string; default_value: string | boolean; readonly: boolean }[] = []
        for (const f of template.fields) {
            if (f.role !== s.role || seen.has(f.name) || !CATALOG_BY_KEY.has(f.name)) continue
            const v = values[f.name]
            if (v === undefined) continue
            seen.add(f.name)
            fields.push({ name: f.name, default_value: v, readonly: true })
        }
        return {
            role: s.role,
            email: s.email,
            name: s.name,
            send_email: notify,
            external_id: `${leaseId}:${doc}`,
            metadata: { leaseId, kind: doc },
            fields,
        }
    })
}

async function archiveSubmission(cfg: DocusealConfig, id: number): Promise<void> {
    try {
        await docusealRequest(cfg, `/api/submissions/${id}`, { method: 'DELETE' })
    } catch (e) {
        if (e instanceof DocusealError && e.status === 404) return
        throw e
    }
}

/** Texte de l'invitation envoyée par RentMaestro en plus de celle de DocuSeal. */
function buildInvitationEmail(name: string, label: string, links: { kind: DocKind; link: string }[]): { subject: string; html: string } {
    const items = links
        .map(l => `<li><a href="${escapeHtml(l.link)}">${l.kind === 'BAIL' ? 'Signer le bail' : "Signer l'acte de cautionnement"}</a></li>`)
        .join('')
    return {
        subject: `Signature de votre bail — ${label}`,
        html: `<p>Bonjour ${escapeHtml(name)},</p>
<p>Le contrat de location du logement situé au <strong>${escapeHtml(label)}</strong> est prêt pour une signature électronique.</p>
<ul>${items}</ul>
<p>La signature se fait directement depuis votre téléphone ou votre ordinateur, sans compte à créer. Vous recevez aussi une invitation de notre plateforme de signature : l'un ou l'autre lien convient.</p>
<p>Une copie du document signé vous sera envoyée automatiquement une fois toutes les signatures recueillies.</p>
<p>Cordialement</p>`,
    }
}

/**
 * Crée les demandes de signature du bail. Refuse si des données manquent ou
 * si une demande est déjà en cours (sauf `regenerate`, qui annule l'ancienne).
 */
export async function sendLeaseForSignature(leaseId: string, opts: { regenerate?: boolean; actor?: string; notify?: boolean } = {}): Promise<SendResult> {
    if (sending.has(leaseId)) throw new SignatureError("Un envoi est déjà en cours pour ce bail.")
    sending.add(leaseId)
    try {
        return await doSend(leaseId, opts)
    } finally {
        sending.delete(leaseId)
    }
}

async function doSend(leaseId: string, opts: { regenerate?: boolean; actor?: string; notify?: boolean }): Promise<SendResult> {
    // notify=false : aucun email (ni DocuSeal ni RentMaestro), les liens sont transmis à la main.
    const notify = opts.notify !== false
    const cfg = await getDocusealConfig()
    if (!cfg) throw new SignatureError("DocuSeal n'est pas configuré (paramètres → Signature des baux).")

    const data = await buildLeaseDocumentData(leaseId)
    if (!data) throw new SignatureError('Bail introuvable.')
    if (data.missing.length > 0) {
        throw new SignatureError(`Il manque ${data.missing.length} donnée(s) pour générer le bail.`, data.missing.map(m => m.label))
    }

    const pending = await prisma.signatureRequest.findMany({ where: { leaseId, status: 'PENDING' } })
    if (pending.length > 0) {
        if (!opts.regenerate) throw new SignatureError('Une demande de signature est déjà en cours pour ce bail. Annulez-la ou régénérez.')
        await cancelLeaseSignature(leaseId, opts.actor)
    }

    const plan: { kind: DocKind; templateId: number; signers: Signer[] }[] = [
        { kind: 'BAIL', templateId: data.templates.bail as number, signers: data.signers.bail },
    ]
    if (data.needsGuaranteeAct) plan.push({ kind: 'CAUTION', templateId: data.templates.caution as number, signers: data.signers.caution })

    // Tout est préparé et contrôlé avant le premier appel qui crée quelque chose.
    const prepared = []
    for (const p of plan) {
        const template = await fetchTemplate(cfg, p.templateId)
        prepared.push({ ...p, body: { template_id: p.templateId, send_email: notify, order: 'random', submitters: submittersPayload(p.kind, p.signers, template, data.values, leaseId, notify) } })
    }

    const created: { kind: DocKind; submissionId: number; submitters: DocusealSubmitterResponse[] }[] = []
    try {
        for (const p of prepared) {
            const submitters = await docusealRequest<DocusealSubmitterResponse[]>(cfg, '/api/submissions', { method: 'POST', body: p.body })
            const submissionId = submitters[0]?.submission_id
            if (!submissionId) throw new SignatureError(`DocuSeal n'a pas renvoyé de demande pour ${KIND_LABEL[p.kind]}.`)
            created.push({ kind: p.kind, submissionId, submitters })
        }
    } catch (e) {
        // Pas de demi-envoi : on archive ce qui a déjà été créé.
        for (const c of created) await archiveSubmission(cfg, c.submissionId).catch(() => {})
        throw e
    }

    await prisma.$transaction([
        ...created.map(c => prisma.signatureRequest.create({ data: { leaseId, kind: c.kind, docusealSubmissionId: c.submissionId, status: 'PENDING', notify } })),
        prisma.lease.update({ where: { id: leaseId }, data: { signatureStatus: 'PENDING' } }),
    ])

    const requests: SentRequest[] = created.map(c => ({
        kind: c.kind,
        submissionId: c.submissionId,
        signers: c.submitters.map(s => ({
            role: s.role,
            name: s.name ?? '',
            email: s.email,
            link: s.embed_src ?? `${cfg.baseUrl}/s/${s.slug}`,
        })),
    }))

    await logAction({
        action: 'SEND_LEASE_SIGNATURE',
        entity: 'Lease',
        entityId: leaseId,
        details: requests.map(r => `${r.kind} #${r.submissionId}`).join(', '),
        userEmail: opts.actor,
    })

    const warnings = notify ? await sendInvitationEmails(requests, data) : []
    return { requests, warnings }
}

/** Une invitation par adresse (un garant reçoit un seul mail pour le bail et l'acte). Le bailleur n'en reçoit pas. */
async function sendInvitationEmails(requests: SentRequest[], data: LeaseDocumentData): Promise<string[]> {
    const warnings: string[] = []
    const byEmail = new Map<string, { name: string; links: { kind: DocKind; link: string }[] }>()
    for (const r of requests) {
        for (const s of r.signers) {
            if (s.role === 'Bailleur') continue
            const key = s.email.toLowerCase()
            const entry = byEmail.get(key) ?? { name: s.name, links: [] }
            entry.links.push({ kind: r.kind, link: s.link })
            byEmail.set(key, entry)
        }
    }
    const label = data.values['logement_adresse']
    const place = typeof label === 'string' ? label : 'votre logement'
    for (const [email, entry] of byEmail) {
        try {
            const mail = buildInvitationEmail(entry.name, place, entry.links)
            await sendEmail({ to: email, subject: mail.subject, html: mail.html })
        } catch {
            warnings.push(`Invitation par email non envoyée à ${email} (l'invitation DocuSeal part quand même).`)
        }
    }
    return warnings
}

/** Annule les demandes en cours (archivage côté DocuSeal) ; l'historique reste en base. */
export async function cancelLeaseSignature(leaseId: string, actor?: string): Promise<{ canceled: number }> {
    const pending = await prisma.signatureRequest.findMany({ where: { leaseId, status: 'PENDING' } })
    if (pending.length === 0) return { canceled: 0 }

    const cfg = await getDocusealConfig()
    if (!cfg) throw new SignatureError("DocuSeal n'est pas configuré : impossible d'annuler les demandes.")

    for (const r of pending) {
        if (r.docusealSubmissionId) await archiveSubmission(cfg, r.docusealSubmissionId)
    }
    await prisma.$transaction([
        prisma.signatureRequest.updateMany({ where: { id: { in: pending.map(r => r.id) } }, data: { status: 'CANCELED' } }),
        prisma.lease.update({ where: { id: leaseId }, data: { signatureStatus: 'CANCELED' } }),
    ])
    await logAction({
        action: 'CANCEL_LEASE_SIGNATURE',
        entity: 'Lease',
        entityId: leaseId,
        details: pending.map(r => `${r.kind} #${r.docusealSubmissionId}`).join(', '),
        userEmail: actor,
    })
    return { canceled: pending.length }
}

/** Archive côté DocuSeal les demandes en cours d'un bail qu'on supprime. Sans effet si DocuSeal est inaccessible. */
export async function archivePendingSubmissionsBestEffort(leaseId: string): Promise<void> {
    try {
        const pending = await prisma.signatureRequest.findMany({ where: { leaseId, status: 'PENDING' } })
        if (pending.length === 0) return
        const cfg = await getDocusealConfig()
        if (!cfg) return
        for (const r of pending) if (r.docusealSubmissionId) await archiveSubmission(cfg, r.docusealSubmissionId).catch(() => {})
    } catch { /* ne jamais bloquer la suppression du bail */ }
}

export interface RequestStatus {
    id: string
    kind: DocKind
    status: string
    sentAt: Date
    completedAt: Date | null
    reminderCount: number
    lastReminderAt: Date | null
    notify: boolean
    submissionId: number | null
    /** Détail par signataire, lu en direct dans DocuSeal (absent si DocuSeal est inaccessible). */
    signers: { role: string; name: string; email: string; status: string; link: string | null }[] | null
}

/**
 * Demandes d'un bail, avec l'état de chaque signataire pour celles en cours.
 * Rattrape au passage les signatures terminées côté DocuSeal dont le webhook
 * n'a pas été reçu (le PDF signé est alors rangé dans la GED).
 */
export async function getLeaseSignatureStatus(leaseId: string): Promise<RequestStatus[]> {
    let rows = await prisma.signatureRequest.findMany({ where: { leaseId }, orderBy: { createdAt: 'desc' } })
    const cfg = rows.some(r => r.status === 'PENDING') ? await getDocusealConfig() : null

    const submissions = new Map<string, RawSubmission>()
    if (cfg) {
        for (const r of rows.filter(x => x.status === 'PENDING')) {
            try {
                const res = await syncSignatureRequest(r.id, cfg)
                if (res.submission) submissions.set(r.id, res.submission)
            } catch { /* DocuSeal inaccessible ou PDF non enregistré : l'état local reste affiché */ }
        }
        rows = await prisma.signatureRequest.findMany({ where: { leaseId }, orderBy: { createdAt: 'desc' } })
    }

    return rows.map(r => {
        const sub = r.status === 'PENDING' ? submissions.get(r.id) : undefined
        const signers: RequestStatus['signers'] = sub?.submitters
            ? sub.submitters.map(s => ({
                role: s.role,
                name: s.name ?? '',
                email: s.email,
                status: s.status ?? 'awaiting',
                link: cfg ? (s.embed_src ?? (s.slug ? `${cfg.baseUrl}/s/${s.slug}` : null)) : null,
            }))
            : null
        return { id: r.id, kind: r.kind as DocKind, status: r.status, sentAt: r.sentAt, completedAt: r.completedAt, reminderCount: r.reminderCount, lastReminderAt: r.lastReminderAt, notify: r.notify, submissionId: r.docusealSubmissionId, signers }
    })
}
