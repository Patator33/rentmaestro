'use client';

import { useState } from 'react';

export default function SetupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (password.length < 8) {
            setError('Le mot de passe doit faire au moins 8 caractères.');
            return;
        }

        setLoading(true);
        const res = await fetch('/api/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error || 'Une erreur est survenue.');
            return;
        }

        window.location.href = '/login';
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
            <div style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏠</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Rentmaestro</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Création du compte administrateur</p>
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Premier lancement</h2>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Mot de passe</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="8 caractères minimum"
                                style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Confirmer le mot de passe</label>
                            <input
                                type="password"
                                required
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
                        >
                            {loading ? 'Création...' : 'Créer le compte'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
