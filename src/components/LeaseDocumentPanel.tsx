'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { previewLeaseDocument, type LeaseDocumentPreview } from '@/actions/lease-document'
import { sendLeaseSignature, cancelLeaseSignatureAction, getLeaseSignatureRequests, type SignatureActionResult } from '@/actions/lease-signature'
import type { RequestStatus } from '@/lib/signature'
import { LEASE_TYPES } from '@/lib/lease-options'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }
const button: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }
const primary: React.CSSProperties = { ...button, background: 'var(--primary-color)', color: '#0e0f12', border: 'none' }
const danger: React.CSSProperties = { ...button, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }

const AREA_LABEL: Record<string, string> = {
    tenant: 'Locataire', apartment: 'Appartement', building: 'Immeuble', company: 'Société', lease: 'Bail', settings: 'Paramètres',
}
const KIND_LABEL: Record<string, string> = { BAIL: 'Bail', CAUTION: 'Acte de cautionnement' }
const REQUEST_STATUS: Record<string, string> = { PENDING: '⏳ En attente', SIGNED: '✅ Signé', CANCELED: '🚫 Annulé', EXPIRED: '⌛ Expiré' }

function signerIcon(status: string) {
    if (status === 'completed') return '✅'
    if (status === 'declined') return '❌'
    return '⏳'
}

function fmt(d: Date | string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Génération du bail : contrôle des données, envoi en signature (DocuSeal),
 * suivi des signataires, annulation et régénération.
 */
export default function LeaseDocumentPanel({ leaseId }: { leaseId: string }) {
    const [preview, setPreview] = useState<LeaseDocumentPreview | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [showValues, setShowValues] = useState(false)
    const [requests, setRequests] = useState<RequestStatus[] | null>(null)
    const [outcome, setOutcome] = useState<SignatureActionResult | null>(null)
    const [notify, setNotify] = useState(true)
    const [pending, startTransition] = useTransition()

    const refreshRequests = useCallback(async () => {
        try { setRequests(await getLeaseSignatureRequests(leaseId)) } catch { setRequests([]) }
    }, [leaseId])

    useEffect(() => { void refreshRequests() }, [refreshRequests])

    const hasPending = !!requests?.some(r => r.status === 'PENDING')

    const load = () => startTransition(async () => {
        setPreview(await previewLeaseDocument(leaseId))
        setLoaded(true)
    })

    const run = (action: () => Promise<SignatureActionResult>) => startTransition(async () => {
        setOutcome(null)
        const res = await action()
        setOutcome(res)
        await refreshRequests()
        if (res.success) setPreview(await previewLeaseDocument(leaseId))
    })

    const send = (regenerate: boolean) => {
        const who = preview
            ? [...preview.signers.bail, ...preview.signers.caution].filter((s, i, a) => a.findIndex(x => x.email === s.email) === i).map(s => `${s.name} (${s.role})`).join(', ')
            : ''
        const docs = preview?.needsGuaranteeAct ? 'le bail et l\'acte de cautionnement' : 'le bail'
        const prefix = regenerate ? 'La demande en cours sera annulée et remplacée.\n\n' : ''
        if (!window.confirm(`${prefix}Envoyer ${docs} en signature ?\n\nSignataires : ${who}\n\n${notify ? 'Des emails leur seront envoyés.' : 'Aucun email ne sera envoyé : vous transmettez les liens vous-même.'}`)) return
        run(() => sendLeaseSignature(leaseId, regenerate, notify))
    }

    const cancel = () => {
        if (!window.confirm('Annuler la demande de signature en cours ? Les liens envoyés cesseront de fonctionner.')) return
        run(() => cancelLeaseSignatureAction(leaseId))
    }

    const copy = async (link: string) => {
        try { await navigator.clipboard.writeText(link) } catch { window.prompt('Lien de signature :', link) }
    }

    const typeLabel = preview?.leaseType ? LEASE_TYPES.find(t => t.value === preview.leaseType)?.label : null
    const canSend = !!preview && preview.missing.length === 0 && !hasPending

    return (
        <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>✍️ Signature du bail</h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Contrôle des données, envoi en signature électronique (DocuSeal) et suivi.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" style={button} disabled={pending} onClick={load}>
                        {pending && !loaded ? '⏳ Contrôle…' : loaded ? '🔄 Recontrôler' : '🔍 Contrôler les données'}
                    </button>
                    {canSend && <button type="button" style={primary} disabled={pending} onClick={() => send(false)}>📨 Envoyer pour signature</button>}
                    {hasPending && <button type="button" style={button} disabled={pending || !preview} title={preview ? undefined : 'Contrôlez les données d\'abord'} onClick={() => send(true)}>♻️ Régénérer</button>}
                    {hasPending && <button type="button" style={danger} disabled={pending} onClick={cancel}>🚫 Annuler la demande</button>}
                </div>
            </div>

            {(canSend || hasPending) && (
                <label style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
                    <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} style={{ accentColor: 'var(--primary-color)' }} />
                    Envoyer les emails d'invitation (sinon, copiez les liens et transmettez-les vous-même)
                </label>
            )}

            {outcome && !outcome.success && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', fontSize: '0.875rem' }}>
                    <strong>{outcome.error}</strong>
                    {outcome.details && outcome.details.length > 0 && (
                        <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>{outcome.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    )}
                </div>
            )}
            {outcome && outcome.success && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)', fontSize: '0.875rem' }}>
                    ✅ Opération réussie.
                    {outcome.warnings.length > 0 && <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>{outcome.warnings.map((w, i) => <li key={i}>⚠️ {w}</li>)}</ul>}
                </div>
            )}

            {requests && requests.length > 0 && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {requests.map(r => (
                        <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', background: 'var(--bg)', opacity: r.status === 'CANCELED' ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                                <strong>{KIND_LABEL[r.kind] ?? r.kind}</strong>
                                <span>{REQUEST_STATUS[r.status] ?? r.status} · envoyé le {fmt(r.sentAt)}{r.completedAt ? ` · signé le ${fmt(r.completedAt)}` : ''}</span>
                            </div>
                            {r.signers && (
                                <ul style={{ margin: '0.5rem 0 0', paddingLeft: 0, listStyle: 'none', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {r.signers.map(s => (
                                        <li key={`${s.role}-${s.email}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span>{signerIcon(s.status)}</span>
                                            <span>{s.role} : {s.name || s.email}</span>
                                            {s.status !== 'completed' && s.link && (
                                                <button type="button" onClick={() => copy(s.link as string)} style={{ ...button, padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}>Copier le lien</button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {loaded && !preview && <p style={{ marginTop: '1rem', color: '#ef4444' }}>Bail introuvable.</p>}

            {preview && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                        <strong>Type de bail :</strong> {typeLabel ?? <span style={{ color: '#ef4444' }}>non défini</span>}
                        {preview.needsGuaranteeAct && <span style={{ marginLeft: '1rem' }}>+ acte de cautionnement</span>}
                    </div>

                    {preview.missing.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)', fontSize: '0.9rem' }}>
                            ✅ Toutes les données nécessaires sont renseignées.
                        </div>
                    ) : (
                        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)' }}>
                            <strong style={{ fontSize: '0.9rem' }}>{preview.missing.length} donnée{preview.missing.length > 1 ? 's' : ''} manquante{preview.missing.length > 1 ? 's' : ''}</strong>
                            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7 }}>
                                {preview.missing.map((m, i) => (
                                    <li key={`${m.area}-${m.label}-${i}`}>
                                        {m.label} — <Link href={m.href} style={{ color: 'var(--primary-color)' }}>{AREA_LABEL[m.area]} →</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {preview.warnings.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {preview.warnings.map((w, i) => <li key={i}>⚠️ {w}</li>)}
                        </ul>
                    )}

                    <div style={{ fontSize: '0.875rem' }}>
                        <strong>Signataires du bail :</strong>
                        <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                            {preview.signers.bail.map(s => (
                                <li key={s.role}>{s.role} : {s.name || '—'} {s.email ? `<${s.email}>` : <span style={{ color: '#ef4444' }}>(email manquant)</span>}</li>
                            ))}
                        </ul>
                        {preview.signers.caution.length > 0 && (
                            <>
                                <strong style={{ display: 'block', marginTop: '0.5rem' }}>Signataire de l'acte de cautionnement :</strong>
                                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                                    {preview.signers.caution.map(s => <li key={s.role}>{s.role} : {s.name || '—'} {s.email ? `<${s.email}>` : '(email manquant)'}</li>)}
                                </ul>
                            </>
                        )}
                    </div>

                    <div>
                        <button type="button" style={{ ...button, fontSize: '0.8rem' }} onClick={() => setShowValues(v => !v)}>
                            {showValues ? 'Masquer' : 'Voir'} les {preview.values.length} valeurs préparées
                        </button>
                        {showValues && (
                            <div style={{ marginTop: '0.75rem', maxHeight: '24rem', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {preview.values.map(v => (
                                            <tr key={v.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.35rem 0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}><code>{v.key}</code></td>
                                                <td style={{ padding: '0.35rem 0.6rem' }}>
                                                    {typeof v.value === 'boolean' ? (v.value ? '☑ coché' : '☐ non coché') : v.value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}
