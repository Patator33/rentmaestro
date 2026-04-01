'use client';

import { useState } from 'react';
import { generatePortalToken, sendPortalInvite } from '@/actions/tenants';

interface Props {
    tenantId: string;
    existingToken: string | null;
}

export default function TenantPortalLink({ tenantId, existingToken }: Props) {
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        const res = await generatePortalToken(tenantId);
        if (!res.success) alert(res.error);
        setLoading(false);
    };

    const handleCopy = () => {
        if (!existingToken) return;
        const url = `${window.location.origin}/portal/${existingToken}`;
        navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papier !');
    };

    const handleCopyToken = () => {
        if (!existingToken) return;
        navigator.clipboard.writeText(existingToken);
        alert('Code d\'accès mobile copié !');
    };

    const handleSendEmail = async () => {
        setSending(true);
        setSent(false);
        const res = await sendPortalInvite(tenantId);
        if (!res.success) {
            alert(res.error);
        } else {
            setSent(true);
            setTimeout(() => setSent(false), 4000);
        }
        setSending(false);
    };

    return (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Portail Locataire</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Générez un lien magique sécurisé pour permettre à ce locataire d'accéder à son historique de paiements et de télécharger ses quittances, sans avoir de compte.
            </p>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {!existingToken ? (
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{ padding: '0.6rem 1.2rem', background: '#2b8cee', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                    >
                        {loading ? 'Génération...' : 'Générer le lien magique'}
                    </button>
                ) : (
                    <>
                        <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${existingToken}`}
                            style={{ flex: 1, minWidth: '200px', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--surface-active)', color: 'var(--text-secondary)' }}
                        />
                        <button
                            onClick={handleCopy}
                            style={{ padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                        >
                            Copier lien
                        </button>
                        <button
                            onClick={handleCopyToken}
                            style={{ padding: '0.6rem 1.2rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                            title="Copier le code pour l'app mobile"
                        >
                            📱 Copier code mobile
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={sending}
                            style={{ padding: '0.6rem 1.2rem', background: '#2b8cee', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
                        >
                            {sending ? 'Envoi...' : sent ? '✓ Email envoyé !' : '✉️ Envoyer par email'}
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{ padding: '0.6rem 1.2rem', background: 'var(--surface-active)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                            title="Régénérer et révoquer l'ancien lien"
                        >
                            {loading ? '...' : 'Régénérer'}
                        </button>
                    </>
                )}
            </div>
            {existingToken && (
                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.5rem' }}>
                    Attention : Régénérer le lien révoquera l'accès à l'ancien lien.
                </p>
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>📱 Application mobile Android</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Partagez l'application avec votre locataire pour qu'il puisse suivre ses paiements et vous contacter.
                    L'envoi par email ci-dessus inclut automatiquement le lien de téléchargement.
                </p>
                <a
                    href="/downloads/rentmaestro-tenant.apk"
                    download="RentMaestro.apk"
                    style={{ display: 'inline-block', padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 500, fontSize: '0.9rem' }}
                >
                    ⬇️ Télécharger l'APK Android
                </a>
            </div>
        </div>
    );
}
