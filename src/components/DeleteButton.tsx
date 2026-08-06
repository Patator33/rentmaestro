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
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'var(--pill-err-bg)',
                color: 'var(--pill-err-color)',
                border: '1px solid var(--pill-err-border)',
                borderRadius: '999px',
                padding: '7px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12.5px',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                opacity: loading ? 0.6 : 1,
            }}
        >
            {loading ? 'Suppression…' : label}
        </button>
    );
}
