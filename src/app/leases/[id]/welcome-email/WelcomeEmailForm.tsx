'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    leaseId: string;
    defaultSubject: string;
    defaultBody: string;
    recipients: string[];
}

export default function WelcomeEmailForm({ leaseId, defaultSubject, defaultBody, recipients }: Props) {
    const router = useRouter();
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

    const send = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`/api/landlord/leases/${leaseId}/welcome-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, body }),
            });
            const data = await res.json();
            if (!res.ok) setResult({ success: false, error: data.error });
            else setResult({ success: true });
        } catch {
            setResult({ success: false, error: 'Erreur réseau' });
        } finally {
            setLoading(false);
        }
    };

    if (result?.success) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#22c55e', marginBottom: '0.5rem' }}>Email envoyé !</p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    Destinataires : {recipients.join(', ')}
                </p>
                <button onClick={() => router.push(`/leases/${leaseId}`)} className="std-add-button">
                    Voir la fiche du bail →
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Destinataire{recipients.length > 1 ? 's' : ''} : <strong style={{ color: 'var(--text-main)' }}>{recipients.join(', ')}</strong>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Objet</label>
                <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Message</label>
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={16}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
            </div>

            {result?.error && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠ {result.error}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                    onClick={() => router.push(`/leases/${leaseId}`)}
                    className="std-add-button"
                    style={{ opacity: 0.7 }}
                >
                    Ignorer
                </button>
                <button
                    onClick={send}
                    disabled={loading}
                    className="std-add-button"
                    style={{ background: 'rgba(43,140,238,0.15)', color: '#2b8cee', borderColor: 'rgba(43,140,238,0.3)' }}
                >
                    {loading ? 'Envoi…' : '📧 Envoyer'}
                </button>
            </div>
        </div>
    );
}
