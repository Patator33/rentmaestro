'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export default function GenerateRentsButton() {
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/generate-rents', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addToast(`${data.message}`, 'success', 5000);
            } else {
                addToast(data.error || 'Erreur', 'error');
            }
        } catch {
            addToast('Erreur réseau', 'error');
        } finally {
            setLoading(false);
            window.location.reload();
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
                padding: '0.5rem 1.25rem',
                background: loading ? 'rgba(43,140,238,0.3)' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
            }}
        >
            {loading ? '⏳ Génération...' : '⚡ Générer les loyers du mois'}
        </button>
    );
}
