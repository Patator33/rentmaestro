'use client';

import { useState } from 'react';
import { updateDepositStatus } from '@/actions/management';
import { useToast } from './Toast';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    PENDING: { label: 'En attente', color: '#f59e0b', icon: '⏳' },
    RECEIVED: { label: 'Reçu', color: '#22c55e', icon: '✅' },
    TO_RETURN: { label: 'À restituer', color: '#3b82f6', icon: '↩️' },
    RETURNED: { label: 'Restitué', color: '#8b5cf6', icon: '💸' },
    DEDUCTED: { label: 'Retenu', color: '#ef4444', icon: '🚫' },
};

interface DepositStatusButtonProps {
    leaseId: string;
    currentStatus: string | null;
    amount: number | null;
}

export default function DepositStatusButton({ leaseId, currentStatus, amount }: DepositStatusButtonProps) {
    const [open, setOpen] = useState(false);
    const { addToast } = useToast();

    if (!amount) return null;

    const current = STATUS_LABELS[currentStatus || 'PENDING'];

    const handleChange = async (newStatus: string) => {
        try {
            await updateDepositStatus(leaseId, newStatus);
            addToast(`Dépôt marqué comme "${STATUS_LABELS[newStatus].label}"`, 'success');
        } catch {
            addToast('Erreur lors de la mise à jour du dépôt', 'error');
        }
        setOpen(false);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    padding: '0.25rem 0.75rem',
                    background: `${current.color}20`,
                    color: current.color,
                    border: `1px solid ${current.color}40`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                }}
            >
                {current.icon} {current.label} ({amount.toFixed(0)}€)
            </button>

            {open && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '0.25rem',
                    background: '#1a1f36',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.25rem',
                    zIndex: 100,
                    minWidth: '160px',
                    boxShadow: 'var(--shadow-lg)',
                }}>
                    {Object.entries(STATUS_LABELS).map(([key, val]) => (
                        <button
                            key={key}
                            onClick={() => handleChange(key)}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 0.75rem',
                                background: key === currentStatus ? `${val.color}15` : 'transparent',
                                border: 'none',
                                color: val.color,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                fontFamily: 'inherit',
                                borderRadius: 'var(--radius-sm)',
                            }}
                        >
                            {val.icon} {val.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
