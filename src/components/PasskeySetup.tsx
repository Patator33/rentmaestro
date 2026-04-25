'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

export default function PasskeySetup({ passkeyCount }: { passkeyCount: number }) {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [count, setCount] = useState(passkeyCount);

    const handleRegister = async () => {
        setLoading(true);
        setMsg('');
        setError('');
        try {
            const startRes = await fetch('/api/auth/passkey/register/start', { method: 'POST' });
            if (!startRes.ok) throw new Error((await startRes.json()).error);
            const options = await startRes.json();

            const credential = await startRegistration({ optionsJSON: options });

            const finishRes = await fetch('/api/auth/passkey/register/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credential),
            });
            if (!finishRes.ok) throw new Error((await finishRes.json()).error);

            setMsg('Windows Hello enregistré avec succès.');
            setCount(c => c + 1);
        } catch (e: any) {
            if (e.name === 'NotAllowedError') setError('Opération annulée ou non autorisée.');
            else setError(e.message || 'Erreur lors de l\'enregistrement.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', fontSize: '1rem' }}>
                🪪 Windows Hello / Biométrie
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Connexion sans mot de passe via Windows Hello, empreinte digitale ou clé de sécurité.
                {count > 0 && <span style={{ color: 'var(--primary-color)', marginLeft: '0.5rem' }}>{count} clé{count > 1 ? 's' : ''} enregistrée{count > 1 ? 's' : ''}.</span>}
            </p>

            {msg && <p style={{ color: '#22c55e', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{msg}</p>}
            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

            <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                    padding: '0.55rem 1.2rem',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                }}
            >
                {loading ? 'Enregistrement...' : count > 0 ? 'Ajouter une clé' : 'Enregistrer Windows Hello'}
            </button>
        </div>
    );
}
