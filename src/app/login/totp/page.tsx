'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TotpPage() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const res = await fetch('/api/auth/totp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error || 'Code incorrect.');
            setCode('');
            return;
        }

        router.push('/');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
            <div style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Vérification 2FA</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Rentmaestro</p>
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '2rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Entrez le code à 6 chiffres affiché dans votre application d'authentification (Google Authenticator, Aegis…)
                    </p>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                            autoFocus
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            style={{ width: '100%', padding: '0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '1.8rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.4rem', boxSizing: 'border-box' }}
                        />
                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            style={{ padding: '0.75rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer', opacity: loading || code.length !== 6 ? 0.7 : 1, fontFamily: 'inherit' }}
                        >
                            {loading ? 'Vérification...' : 'Vérifier'}
                        </button>
                        <a href="/login" style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            ← Retour à la connexion
                        </a>
                    </form>
                </div>
            </div>
        </div>
    );
}
