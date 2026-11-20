/**
 * Retour de DocuSeal : état réel des demandes de signature (webhook, ouverture
 * de la page du bail, rattrapage périodique), PDF signé rangé dans la GED du
 * bail, statut du bail et notification.
 *
 * L'état n'est jamais déduit du corps d'un webhook : on relit toujours la
 * demande dans DocuSeal avec la clé API, et on ne télécharge un fichier que
 * depuis l'URL DocuSeal configurée.
 */
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { notifyN8n } from '@/lib/n8n'
import { saveUploadedFile } from '@/lib/uploads'
import { DocusealError, docusealRequest, getDocusealConfig, type DocusealConfig } from '@/lib/docuseal'
import type { DocKind } from '@/lib/lease-catalog'

export interface RawSubmission {
    id: number
    status?: string
    archived_at?: string | null
    completed_at?: string | null
    documents?: { name?: string; url?: string }[]
    submitters?: { role: string; name?: string | null; email: string; status?: string; slug?: string; embed_src?: string; declined_at?: string | null }[]
}

export type SyncOutcome = 'SIGNED' | 'CANCELED' | 'EXPIRED' | 'PENDING' | 'IGNORED'

const MAX_PDF_BYTES = 20 * 1024 * 1024 // même plafond que les envois de fichiers

// Un seul processus : un verrou mémoire évite deux finalisations simultanées d'une même demande.
const finalizing = new Set<string>()

function fullName(first: string, last: string): string {
    return `${first.trim()} ${last.trim().toUpperCase()}`.trim()
}

/** Supprime des fichiers déjà écrits dans public/uploads (traitement perdu ou échoué). */
async function removeUploadedFiles(urls: string[]): Promise<void> {
    for (const url of urls) {
        try { await unlink(path.join(process.cwd(), 'public', 'uploads', path.basename(url))) } catch { /* déjà absent */ }
    }
}

/** Télécharge un PDF signé depuis l'hôte configuré, jamais depuis l'hôte écrit dans la réponse. */
async function downloadSignedPdf(cfg: DocusealConfig, fileUrl: string): Promise<Buffer> {
    let u: URL
    try { u = new URL(fileUrl) } catch { throw new DocusealError('URL de document invalide.') }
    const target = `${cfg.baseUrl}${u.pathname}${u.search}`

    let res: Response
    try {
        res = await fetch(target, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(60_000) })
    } catch {
        throw new DocusealError('Téléchargement du PDF signé impossible (DocuSeal injoignable).')
    }
    if (!res.ok) throw new DocusealError(`Téléchargement du PDF signé refusé (${res.status}).`, res.status)

    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_PDF_BYTES) throw new DocusealError('PDF signé trop volumineux (plus de 20 Mo).')
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_PDF_BYTES) throw new DocusealError('PDF signé trop volumineux (plus de 20 Mo).')
    if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new DocusealError("Le fichier téléchargé n'est pas un PDF.")
    return buf
}

/** Statut du bail déduit de ses demandes : en cours, signé, ou annulé. */
async function recomputeLeaseStatus(tx: Pick<typeof prisma, 'signatureRequest' | 'lease'>, leaseId: string): Promise<string> {
    const [pending, signed] = await Promise.all([
        tx.signatureRequest.count({ where: { leaseId, status: 'PENDING' } }),
        tx.signatureRequest.count({ where: { leaseId, status: 'SIGNED' } }),
    ])
    const status = pending > 0 ? 'PENDING' : signed > 0 ? 'SIGNED' : 'CANCELED'
    await tx.lease.update({ where: { id: leaseId }, data: { signatureStatus: status } })
    return status
}

async function finalizeSigned(row: { id: string; leaseId: string; kind: string; createdAt: Date }, sub: RawSubmission, cfg: DocusealConfig): Promise<void> {
    if (finalizing.has(row.id)) return
    finalizing.add(row.id)
    try {
        const lease = await prisma.lease.findUnique({ where: { id: row.leaseId }, include: { tenant: true, apartment: true } })
        if (!lease) return

        const docs = (sub.documents ?? []).filter(d => d.url)
        if (docs.length === 0) throw new DocusealError("DocuSeal n'a renvoyé aucun document signé.")

        const kind = row.kind as DocKind
        const place = lease.apartment.name?.trim() || lease.apartment.address
        const hasCoTenant = (sub.submitters ?? []).some(s => s.role === 'Colocataire') && !!(lease.tenant.coTenantFirstName || lease.tenant.coTenantLastName)
        const tenants = [fullName(lease.tenant.firstName, lease.tenant.lastName)]
        if (hasCoTenant) tenants.push(fullName(lease.tenant.coTenantFirstName ?? '', lease.tenant.coTenantLastName ?? ''))
        const guarantor = fullName(lease.guarantorFirstName ?? '', lease.guarantorLastName ?? '')
        const baseName = kind === 'BAIL'
            ? `bail signé ${tenants.join(' et ')} ${place}`
            : `acte de cautionnement signé ${guarantor || tenants[0]} ${place}`

        // Les fichiers sont écrits avant la transaction : en cas d'échec, seul un fichier orphelin reste (jamais de ligne sans fichier).
        const saved: { name: string; url: string; size: number }[] = []
        for (const [i, d] of docs.entries()) {
            const pdf = await downloadSignedPdf(cfg, d.url as string)
            const file = await saveUploadedFile(new File([new Uint8Array(pdf)], 'document-signe.pdf', { type: 'application/pdf' }))
            saved.push({ name: docs.length > 1 ? `${baseName} (${i + 1})` : baseName, url: file.url, size: pdf.length })
        }

        let outcome: { leaseStatus: string; kinds: DocKind[] } | null
        try {
            outcome = await prisma.$transaction(async tx => {
                const claimed = await tx.signatureRequest.updateMany({
                    where: { id: row.id, status: 'PENDING' },
                    data: { status: 'SIGNED', completedAt: sub.completed_at ? new Date(sub.completed_at) : new Date() },
                })
                if (claimed.count === 0) return null // déjà traitée

                let firstDocId: string | null = null
                for (const s of saved) {
                    const doc = await tx.leaseDocument.create({
                        data: { leaseId: row.leaseId, name: s.name, url: s.url, type: 'application/pdf', docType: kind === 'BAIL' ? 'BAIL' : 'CAUTIONNEMENT', size: s.size },
                    })
                    firstDocId = firstDocId ?? doc.id
                }
                await tx.signatureRequest.update({ where: { id: row.id }, data: { signedDocumentId: firstDocId } })
                const leaseStatus = await recomputeLeaseStatus(tx, row.leaseId)
                const signedKinds = await tx.signatureRequest.findMany({
                    where: { leaseId: row.leaseId, status: 'SIGNED', createdAt: { gte: new Date(row.createdAt.getTime() - 5 * 60_000) } },
                    select: { kind: true },
                })
                return { leaseStatus, kinds: signedKinds.map(k => k.kind as DocKind) }
            })
        } catch (e) {
            await removeUploadedFiles(saved.map(f => f.url))
            throw e
        }
        if (!outcome) {
            // Une autre exécution a déjà classé ce document : on retire notre copie.
            await removeUploadedFiles(saved.map(f => f.url))
            return
        }

        await logAction({ action: 'LEASE_SIGNED', entity: 'Lease', entityId: row.leaseId, details: saved.map(s => s.name).join(', '), userEmail: 'docuseal' })

        if (outcome.leaseStatus === 'SIGNED') {
            const kinds = Array.from(new Set(outcome.kinds))
            notifyN8n('LEASE_SIGNED', {
                tenantName: tenants.join(' et '),
                apartment: place,
                documents: kinds.map(k => (k === 'BAIL' ? 'bail' : 'acte de cautionnement')).join(' + '),
            }).catch(() => {})
        }
    } finally {
        finalizing.delete(row.id)
    }
}

/**
 * Relit la demande dans DocuSeal et met l'état local à jour : signée (PDF rangé
 * dans la GED), annulée ou expirée côté DocuSeal. Idempotent.
 */
export async function syncSignatureRequest(requestId: string, cfgArg?: DocusealConfig | null): Promise<{ outcome: SyncOutcome; submission?: RawSubmission }> {
    const row = await prisma.signatureRequest.findUnique({ where: { id: requestId } })
    if (!row || !row.docusealSubmissionId) return { outcome: 'IGNORED' }
    if (row.status !== 'PENDING') return { outcome: row.status as SyncOutcome }

    const cfg = cfgArg ?? await getDocusealConfig()
    if (!cfg) return { outcome: 'IGNORED' }

    let sub: RawSubmission
    try {
        sub = await docusealRequest<RawSubmission>(cfg, `/api/submissions/${row.docusealSubmissionId}`)
    } catch (e) {
        if (e instanceof DocusealError && e.status === 404) {
            await setTerminalStatus(row.id, row.leaseId, 'CANCELED')
            return { outcome: 'CANCELED' }
        }
        throw e
    }

    if (sub.archived_at) {
        await setTerminalStatus(row.id, row.leaseId, 'CANCELED')
        return { outcome: 'CANCELED', submission: sub }
    }
    if (sub.status === 'completed') {
        await finalizeSigned(row, sub, cfg)
        const after = await prisma.signatureRequest.findUnique({ where: { id: row.id } })
        return { outcome: (after?.status as SyncOutcome) ?? 'PENDING', submission: sub }
    }
    if (sub.status === 'expired') {
        await setTerminalStatus(row.id, row.leaseId, 'EXPIRED')
        return { outcome: 'EXPIRED', submission: sub }
    }
    return { outcome: 'PENDING', submission: sub }
}

async function setTerminalStatus(requestId: string, leaseId: string, status: 'CANCELED' | 'EXPIRED') {
    await prisma.$transaction(async tx => {
        const res = await tx.signatureRequest.updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status } })
        if (res.count > 0) {
            const left = await tx.signatureRequest.count({ where: { leaseId, status: 'PENDING' } })
            const signed = await tx.signatureRequest.count({ where: { leaseId, status: 'SIGNED' } })
            await tx.lease.update({ where: { id: leaseId }, data: { signatureStatus: left > 0 ? 'PENDING' : signed > 0 ? 'SIGNED' : status } })
        }
    })
}

/** Rattrapage : synchronise toutes les demandes en cours (utile si le webhook n'a pas été reçu). */
export async function syncPendingSignatures(): Promise<{ checked: number; signed: number }> {
    const cfg = await getDocusealConfig()
    if (!cfg) return { checked: 0, signed: 0 }
    const pending = await prisma.signatureRequest.findMany({ where: { status: 'PENDING', docusealSubmissionId: { not: null } }, select: { id: true } })
    let signed = 0
    for (const r of pending) {
        try {
            const res = await syncSignatureRequest(r.id, cfg)
            if (res.outcome === 'SIGNED') signed++
        } catch (e) {
            console.error('[signature] synchronisation impossible :', e instanceof Error ? e.message : e)
        }
    }
    return { checked: pending.length, signed }
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/**
 * Traite un événement de webhook DocuSeal. Seul l'identifiant de la demande est
 * repris du corps ; l'état vient de DocuSeal (relu avec la clé API).
 */
export async function handleDocusealEvent(eventType: string, rawData: unknown): Promise<{ handled: number }> {
    const data = asRecord(rawData)
    if (!data) return { handled: 0 }
    const submissionId = eventType.startsWith('form.') ? asRecord(data.submission)?.id : data.id
    if (typeof submissionId !== 'number' || !Number.isInteger(submissionId)) return { handled: 0 }

    const rows = await prisma.signatureRequest.findMany({ where: { docusealSubmissionId: submissionId, status: 'PENDING' } })
    for (const r of rows) await syncSignatureRequest(r.id)

    if (eventType === 'form.declined' && rows.length > 0) {
        const lease = await prisma.lease.findUnique({ where: { id: rows[0].leaseId }, include: { tenant: true, apartment: true } })
        if (lease) {
            notifyN8n('LEASE_SIGNATURE_DECLINED', {
                tenantName: fullName(lease.tenant.firstName, lease.tenant.lastName),
                apartment: lease.apartment.name?.trim() || lease.apartment.address,
                signer: typeof data.email === 'string' ? data.email : '',
                reason: typeof data.decline_reason === 'string' ? data.decline_reason : '',
            }).catch(() => {})
        }
    }
    return { handled: rows.length }
}
