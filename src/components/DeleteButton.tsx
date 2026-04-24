'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({
    deleteAction,
    confirmMessage,
    redirectTo,
    label = '🗑 Supprimer',
}: {
    deleteAction: () => Promise<void>;
    confirmMessage: string;
    redirectTo: string;
    label?: string;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleClick = async () => {
        if (!confirm(confirmMessage)) return;
        setLoading(true);
        try {
            await deleteAction();
            router.push(redirectTo);
        } catch (e: any) {
            alert(e.message || 'Erreur lors de la suppression');
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '0.5rem 1.25rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                opacity: loading ? 0.6 : 1,
            }}
        >
            {loading ? 'Suppression…' : label}
        </button>
    );
}
