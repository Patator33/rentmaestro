'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Props {
    totpEnabled: boolean;
}

export default function TotpSetup({ totpEnabled }: Props) {
    const [enabled, setEnabled] = useState(totpEnabled);
    const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const startSetup = async () => {
        setLoading(true);
        setError('');
        const res = await fetch('/api/auth/totp/setup');
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error); return; }
        setQrDataUrl(data.qrDataUrl);
        setSecret(data.secret);
        setStep('qr');
    };

    const verifyAndEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await fetch('/api/auth/totp/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, code }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error); setCode(''); return; }
        setEnabled(true);
        setStep('done');
    };

    const disable = async () => {
        if (!confirm('Désactiver le TOTP ? Vous ne serez plus protégé par la double authentification.')) return;
        setLoading(true);
        const res = await fetch('/api/auth/totp/setup', { method: 'DELETE' });
        setLoading(false);
        if (res.ok) {
            setEnabled(false);
            setStep('idle');
        }
    };

    return (
        <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        Authentification à deux facteurs (TOTP)
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {enabled
                            ? '✅ Activée — votre compte est protégé par une 2e étape de connexion.'
                            : 'Non activée — ajoutez une couche de sécurité supplémentaire.'}
                    </p>
                </div>
                <span style={{
                    padding: '0.3rem 0.8rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: enabled ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                    color: enabled ? 'var(--success)' : 'var(--text-muted)',
                }}>
                    {enabled ? 'Activé' : 'Désactivé'}
                </span>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* Idle: not enabled */}
            {!enabled && step === 'idle' && (
                <button
                    onClick={startSetup}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.2rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'Génération...' : '+ Activer le TOTP'}
                </button>
            )}

            {/* Step 1: Show QR code */}
            {step === 'qr' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrDataUrl} alt="QR Code TOTP" style={{ width: 180, height: 180, borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                1. Ouvrez votre application d'authentification<br />
                                (Google Authenticator, Aegis, Bitwarden…)
                            </p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                2. Scannez le QR code ou entrez la clé manuellement :
                            </p>
                            <code style={{ display: 'block', padding: '0.5rem 0.75rem', background: 'var(--surface-active)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--primary-color)', wordBreak: 'break-all', border: '1px solid var(--border-color)' }}>
                                {secret}
                            </code>
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            3. Entrez le code à 6 chiffres affiché par l'application pour confirmer :
                        </p>
                        <form onSubmit={verifyAndEnable} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                style={{ padding: '0.65rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-active)', color: 'var(--text-main)', fontSize: '1.4rem', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.3rem', width: '160px' }}
                            />
                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                style={{ padding: '0.65rem 1.2rem', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: loading || code.length !== 6 ? 0.7 : 1 }}
                            >
                                {loading ? '...' : '✓ Activer'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('idle')}
                                style={{ padding: '0.65rem 1rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Done */}
            {step === 'done' && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '1rem', color: 'var(--success)', fontWeight: 500 }}>
                    ✅ TOTP activé avec succès ! La prochaine connexion demandera votre code.
                </div>
            )}

            {/* Enabled: offer to disable */}
            {enabled && step !== 'done' && (
                <button
                    onClick={disable}
                    disabled={loading}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'none', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? '...' : 'Désactiver le TOTP'}
                </button>
            )}
        </div>
    );
}
