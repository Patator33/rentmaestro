/**
 * Entretien horaire des demandes de signature : rattrapage des signatures
 * terminées côté DocuSeal (si le webhook n'est pas arrivé) puis rappels aux
 * signataires qui tardent. Lancé par le planificateur interne (instrumentation.ts).
 *
 * Rappels : après `signature_reminder_days` jours sans signature (puis tous les
 * `signature_reminder_days` jours), jusqu'à `signature_reminder_max` rappels.
 *  - Invitations envoyées par email : un email de rappel avec le lien, une seule
 *    fois par adresse (un garant n'en reçoit pas deux pour le bail et l'acte).
 *  - Liens transmis à la main : aucun email aux signataires ; Telegram prévient
 *    le propriétaire qu'il y a une relance à faire.
 * Le bailleur n'est jamais relancé par email : il reçoit la notification Telegram.
 */
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/portal-invite'
import { notifyN8n } from '@/lib/n8n'
import { getDocusealConfig } from '@/lib/docuseal'
import { syncSignatureRequest, type RawSubmission } from '@/lib/signature-sync'
import {
    DOCUSEAL_SETTING_KEYS as K, DEFAULT_SIGNATURE_REMINDER_DAYS, DEFAULT_SIGNATURE_REMINDER_MAX,
} from '@/lib/lease-options'
import type { DocKind } from '@/lib/lease-catalog'

export interface MaintenanceResult {
    checked: number
    signed: number
    reminded: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const FINISHED = new Set(['completed', 'declined'])

let running = false

async function readReminderSettings(): Promise<{ days: number; max: number }> {
    const rows = await prisma.setting.findMany({ where: { key: { in: [K.reminderDays, K.reminderMax] } } })
    const map = new Map(rows.map(r => [r.key, r.value]))
    const days = parseInt(map.get(K.reminderDays) ?? '', 10)
    const max = parseInt(map.get(K.reminderMax) ?? '', 10)
    return {
        days: Number.isFinite(days) && days > 0 ? days : DEFAULT_SIGNATURE_REMINDER_DAYS,
        max: Number.isFinite(max) && max >= 0 ? max : DEFAULT_SIGNATURE_REMINDER_MAX,
    }
}

function buildReminderEmail(name: string, place: string, links: { kind: DocKind; link: string }[], days: number): { subject: string; html: string } {
    const items = links
        .map(l => `<li><a href="${escapeHtml(l.link)}">${l.kind === 'BAIL' ? 'Signer le bail' : "Signer l'acte de cautionnement"}</a></li>`)
        .join('')
    return {
        subject: `Rappel : signature de votre bail — ${place}`,
        html: `<p>Bonjour ${escapeHtml(name)},</p>
<p>Nous n'avons pas encore reçu votre signature pour le contrat de location du logement situé au <strong>${escapeHtml(place)}</strong> (demande envoyée il y a plus de ${days} jour${days > 1 ? 's' : ''}).</p>
<ul>${items}</ul>
<p>La signature prend quelques minutes, directement depuis votre téléphone ou votre ordinateur, sans compte à créer.</p>
<p>Cordialement</p>`,
    }
}

interface Candidate {
    id: string
    leaseId: string
    kind: DocKind
    notify: boolean
    reminderCount: number
    sentAt: Date
    submission: RawSubmission
}

/** Rappels d'un bail : emails aux signataires en retard, puis notification au propriétaire. */
async function remindLease(leaseId: string, due: Candidate[], cfgBaseUrl: string, now: Date, days: number, max: number): Promise<boolean> {
    const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { tenant: true, apartment: true } })
    if (!lease) return false
    const place = lease.apartment.name?.trim() || lease.apartment.address
    const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName.toUpperCase()}`.trim()

    const waiting: string[] = []
    const byEmail = new Map<string, { name: string; links: { kind: DocKind; link: string }[] }>()
    for (const c of due) {
        for (const s of c.submission.submitters ?? []) {
            if (FINISHED.has(s.status ?? '')) continue
            const label = `${s.role} (${s.name || s.email})`
            if (!waiting.includes(label)) waiting.push(label)
            if (s.role === 'Bailleur' || !c.notify || !s.email) continue
            const link = s.embed_src ?? (s.slug ? `${cfgBaseUrl}/s/${s.slug}` : null)
            if (!link) continue
            const key = s.email.toLowerCase()
            const entry = byEmail.get(key) ?? { name: s.name || s.email, links: [] }
            entry.links.push({ kind: c.kind, link })
            byEmail.set(key, entry)
        }
    }
    if (waiting.length === 0) return false

    // Aucune relance par email possible (liens transmis à la main, ou seul le bailleur n'a pas signé) : le propriétaire est prévenu.
    const manual = byEmail.size === 0
    let sent = 0
    for (const [email, entry] of byEmail) {
        try {
            const mail = buildReminderEmail(entry.name, place, entry.links, days)
            await sendEmail({ to: email, subject: mail.subject, html: mail.html })
            sent++
        } catch (e) {
            console.error(`[signature] rappel non envoyé à ${email} :`, e instanceof Error ? e.message : e)
        }
    }
    // Tous les emails ont échoué : on réessaiera à la prochaine heure sans compter ce rappel.
    if (!manual && sent === 0) return false

    const count = Math.max(...due.map(c => c.reminderCount)) + 1
    await prisma.signatureRequest.updateMany({
        where: { id: { in: due.map(c => c.id) }, status: 'PENDING' },
        data: { lastReminderAt: now, reminderCount: { increment: 1 } },
    })

    const last = count >= max
    // Notification au propriétaire : à chaque rappel s'il doit relancer lui-même, sinon au dernier rappel automatique.
    if (manual || last) {
        const waitDays = Math.floor((now.getTime() - Math.min(...due.map(c => c.sentAt.getTime()))) / DAY_MS)
        notifyN8n('LEASE_SIGNATURE_REMINDER', {
            tenantName,
            apartment: place,
            waiting: waiting.join(', '),
            days: waitDays,
            note: manual
                ? 'À relancer manuellement (liens transmis à la main).'
                : last ? `Dernier rappel envoyé (${count}/${max}) : plus de relance automatique.` : `Rappel ${count}/${max} envoyé.`,
        }).catch(() => {})
    }
    return true
}

/**
 * Rattrape les signatures terminées puis relance les signataires qui tardent.
 * Sans effet si DocuSeal n'est pas configuré. Un seul passage à la fois.
 */
export async function runSignatureMaintenance(now = new Date()): Promise<MaintenanceResult> {
    const result: MaintenanceResult = { checked: 0, signed: 0, reminded: 0 }
    if (running) return result
    running = true
    try {
        const cfg = await getDocusealConfig()
        if (!cfg) return result
        const { days, max } = await readReminderSettings()

        const pending = await prisma.signatureRequest.findMany({
            where: { status: 'PENDING', docusealSubmissionId: { not: null } },
            orderBy: { createdAt: 'asc' },
        })
        result.checked = pending.length

        const dueByLease = new Map<string, Candidate[]>()
        for (const r of pending) {
            let sync
            try {
                sync = await syncSignatureRequest(r.id, cfg)
            } catch (e) {
                console.error('[signature] synchronisation impossible :', e instanceof Error ? e.message : e)
                continue
            }
            if (sync.outcome === 'SIGNED') { result.signed++; continue }
            if (sync.outcome !== 'PENDING' || !sync.submission) continue

            const reference = r.lastReminderAt ?? r.sentAt
            const isDue = max > 0 && r.reminderCount < max && now.getTime() - reference.getTime() >= days * DAY_MS
            if (!isDue) continue
            const list = dueByLease.get(r.leaseId) ?? []
            list.push({ id: r.id, leaseId: r.leaseId, kind: r.kind as DocKind, notify: r.notify, reminderCount: r.reminderCount, sentAt: r.sentAt, submission: sync.submission })
            dueByLease.set(r.leaseId, list)
        }

        for (const [leaseId, due] of dueByLease) {
            try {
                if (await remindLease(leaseId, due, cfg.baseUrl, now, days, max)) result.reminded++
            } catch (e) {
                console.error('[signature] rappel impossible :', e instanceof Error ? e.message : e)
            }
        }
        return result
    } finally {
        running = false
    }
}
