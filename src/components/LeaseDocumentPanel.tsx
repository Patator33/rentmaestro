'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { previewLeaseDocument, type LeaseDocumentPreview } from '@/actions/lease-document'
import { LEASE_TYPES } from '@/lib/lease-options'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }
const button: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }

const AREA_LABEL: Record<string, string> = {
    tenant: 'Locataire', apartment: 'Appartement', building: 'Immeuble', company: 'Société', lease: 'Bail', settings: 'Paramètres',
}

/**
 * Contrôle des données du bail avant envoi en signature : ce qui manque (avec le
 * lien pour le saisir), les signataires prévus et les valeurs qui partiront dans
 * les champs DocuSeal. Ne contacte pas DocuSeal.
 */
export default function LeaseDocumentPanel({ leaseId }: { leaseId: string }) {
    const [preview, setPreview] = useState<LeaseDocumentPreview | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [showValues, setShowValues] = useState(false)
    const [pending, startTransition] = useTransition()

    const load = () => startTransition(async () => {
        setPreview(await previewLeaseDocument(leaseId))
        setLoaded(true)
    })

    const typeLabel = preview?.leaseType ? LEASE_TYPES.find(t => t.value === preview.leaseType)?.label : null

    return (
        <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>✍️ Génération du bail</h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Contrôle des données avant envoi en signature (DocuSeal).
                    </p>
                </div>
                <button type="button" style={button} disabled={pending} onClick={load}>
                    {pending ? '⏳ Contrôle…' : loaded ? '🔄 Recontrôler' : '🔍 Contrôler les données'}
                </button>
            </div>

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
