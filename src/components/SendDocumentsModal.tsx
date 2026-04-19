'use client';

import { useState } from 'react';
import { sendDocumentsEmail, DocToSend } from '@/actions/email';

interface Props {
    leaseId: string;
    tenantEmail: string;
    coTenantEmail?: string | null;
    leaseDocs: DocToSend[];
    companyDocs: DocToSend[];
    apartmentDocs: DocToSend[];
    globalDocs: DocToSend[];
}

export default function SendDocumentsModal({ leaseId, tenantEmail, coTenantEmail, leaseDocs, companyDocs, apartmentDocs, globalDocs }: Props) {
    const [open, setOpen] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

    const allDocs = [
        ...leaseDocs.map(d => ({ ...d, group: 'Bail' })),
        ...companyDocs.map(d => ({ ...d, group: 'Société' })),
        ...apartmentDocs.map(d => ({ ...d, group: 'Appartement' })),
        ...globalDocs.map(d => ({ ...d, group: 'GED Globale' })),
    ];

    const toggle = (url: string) => {
        setChecked(prev => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url); else next.add(url);
            return next;
        });
    };

    const handleSend = async () => {
        const selected = allDocs.filter(d => checked.has(d.url));
        if (selected.length === 0) return;
        setSending(true);
        setResult(null);
        const res = await sendDocumentsEmail(leaseId, selected);
        setResult(res);
        setSending(false);
        if (res.success) {
            setTimeout(() => { setOpen(false); setChecked(new Set()); setResult(null); }, 1500);
        }
    };

    const recipients = coTenantEmail ? `${tenantEmail}, ${coTenantEmail}` : tenantEmail;

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
            >
                📧 Envoyer des documents
            </button>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📧 Envoyer des documents</h2>
                    <button onClick={() => { setOpen(false); setChecked(new Set()); setResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>✕</button>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Destinataire(s) : <strong>{recipients}</strong>
                </p>

                {allDocs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Aucun document disponible. Ajoutez des documents dans la GED de la société, de l'appartement ou la GED globale.</p>
                ) : (
                    <>
                        {(['Bail', 'Société', 'Appartement', 'GED Globale'] as const).map(group => {
                            const groupDocs = allDocs.filter(d => d.group === group);
                            if (groupDocs.length === 0) return null;
                            return (
                                <div key={group} style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{group}</p>
                                    {groupDocs.map(doc => (
                                        <label key={doc.url} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', background: checked.has(doc.url) ? 'rgba(43,140,238,0.08)' : 'var(--surface)', border: `1px solid ${checked.has(doc.url) ? 'rgba(43,140,238,0.3)' : 'var(--border-color)'}`, marginBottom: '0.35rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={checked.has(doc.url)}
                                                onChange={() => toggle(doc.url)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{doc.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{doc.docType}</span>
                                        </label>
                                    ))}
                                </div>
                            );
                        })}

                        {result && (
                            <div style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', marginBottom: '0.75rem', background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: result.success ? '#22c55e' : '#ef4444', fontSize: '0.88rem' }}>
                                {result.success ? '✓ Email envoyé avec succès !' : `Erreur : ${result.error}`}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={handleSend}
                                disabled={checked.size === 0 || sending}
                                style={{ flex: 1, background: checked.size === 0 ? 'var(--border-color)' : 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1rem', cursor: checked.size === 0 ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                            >
                                {sending ? 'Envoi…' : `Envoyer${checked.size > 0 ? ` (${checked.size})` : ''}`}
                            </button>
                            <button
                                onClick={() => { setOpen(false); setChecked(new Set()); setResult(null); }}
                                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                Annuler
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
