'use client';

import { useState } from 'react';
import { generatePortalToken } from '@/actions/tenants';

interface Props {
    tenantId: string;
    existingToken: string | null;
}

export default function TenantPortalLink({ tenantId, existingToken }: Props) {
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        const res = await generatePortalToken(tenantId);
        if (!res.success) {
            alert(res.error);
        }
        setLoading(false);
    };

    const handleCopy = () => {
        if (!existingToken) return;
        const url = `${window.location.origin}/portal/${existingToken}`;
        navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papier !');
    };

    return (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Portail Locataire</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                Générez un lien magique sécurisé pour permettre à ce locataire d'accéder à son historique de paiements et de télécharger ses quittances, sans avoir de compte.
            </p>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                            style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#475569' }}
                        />
                        <button
                            onClick={handleCopy}
                            style={{ padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                        >
                            Copier
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{ padding: '0.6rem 1.2rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
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
        </div>
    );
}
