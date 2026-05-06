'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

function Form() {
    const searchParams = useSearchParams();
    const from = searchParams.get('from') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [webAuthnSupported, setWebAuthnSupported] = useState(false);
    const [bioLoading, setBioLoading] = useState(false);

    useEffect(() => {
        setWebAuthnSupported(browserSupportsWebAuthn());
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error || 'Identifiants incorrects.');
            return;
        }

        if (data.requireTotp) {
            window.location.href = '/login/totp';
        } else {
            window.location.href = from;
        }
    };

    const handlePasskey = async () => {
        setBioLoading(true);
        setError('');
        try {
            const startRes = await fetch('/api/auth/passkey/login/start', { method: 'POST' });
            if (!startRes.ok) throw new Error((await startRes.json()).error);
            const options = await startRes.json();

            const credential = await startAuthentication({ optionsJSON: options });

            const finishRes = await fetch('/api/auth/passkey/login/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credential),
            });
            if (!finishRes.ok) throw new Error((await finishRes.json()).error);

            window.location.href = from;
        } catch (e: any) {
            if (e.name !== 'NotAllowedError') {
                setError(e.message || 'Authentification échouée.');
            }
        } finally {
            setBioLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
            <div style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}><Logo size={64} /></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Rentmaestro</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Gestionnaire de biens immobiliers</p>
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Connexion</h2>

                    {webAuthnSupported && (
                        <>
                            <button
                                type="button"
                                onClick={handlePasskey}
                                disabled={bioLoading}
                                style={{
                                    width: '100%', padding: '0.75rem', marginBottom: '1.25rem',
                                    background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                    border: '1.5px solid rgba(99,102,241,0.35)', borderRadius: '8px',
                                    fontWeight: 600, fontSize: '1rem', cursor: bioLoading ? 'not-allowed' : 'pointer',
                                    opacity: bioLoading ? 0.7 : 1, fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                }}
                            >
                                <span style={{ fontSize: '1.3rem' }}>{bioLoading ? '⏳' : '🪪'}</span>
                                {bioLoading ? 'Vérification...' : 'Se connecter avec Windows Hello'}
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ou</span>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                            </div>
                        </>
                    )}

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
                                autoFocus
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Mot de passe</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    tabIndex={-1}
                                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', padding: '0.2rem', lineHeight: 1 }}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
                        >
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function LoginForm() {
    return (
        <Suspense>
            <Form />
        </Suspense>
    );
}
