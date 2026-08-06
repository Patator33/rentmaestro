'use client';

import { useState } from 'react';
import { updateDepositStatus } from '@/actions/management';
import { payDepositPartial } from '@/actions/leases';
import { useToast } from './Toast';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    PENDING:          { label: 'En attente',      color: '#f59e0b', icon: '⏳' },
    PARTIAL_RECEIVED: { label: 'Partiel. perçue', color: '#f97316', icon: '💰' },
    RECEIVED:         { label: 'Caution reçue',   color: '#22c55e', icon: '✅' },
    TO_RETURN:        { label: 'À restituer',      color: '#3b82f6', icon: '↩️' },
    RETURNED:         { label: 'Restitué',         color: '#8b5cf6', icon: '💸' },
    DEDUCTED:         { label: 'Retenu',           color: '#ef4444', icon: '🚫' },
};

interface DepositStatusButtonProps {
    leaseId: string;
    currentStatus: string | null;
    amount: number | null;
    depositPaidAmount?: number | null;
}

export default function DepositStatusButton({ leaseId, currentStatus, amount, depositPaidAmount }: DepositStatusButtonProps) {
    const [open, setOpen] = useState(false);
    const [partialMode, setPartialMode] = useState(false);
    const [partialAmount, setPartialAmount] = useState('');
    const { addToast } = useToast();

    if (!amount) return null;

    const alreadyPaid = depositPaidAmount ?? 0;
    const remaining = amount - alreadyPaid;

    const current = STATUS_LABELS[currentStatus || 'PENDING'];

    const handleChange = async (newStatus: string) => {
        if (newStatus === 'PARTIAL_RECEIVED') {
            setOpen(false);
            setPartialMode(true);
            return;
        }
        try {
            await updateDepositStatus(leaseId, newStatus);
            addToast(`Dépôt marqué comme "${STATUS_LABELS[newStatus].label}"`, 'success');
        } catch {
            addToast('Erreur lors de la mise à jour du dépôt', 'error');
        }
        setOpen(false);
    };

    const handlePartialSubmit = async () => {
        const paid = parseFloat(partialAmount);
        if (isNaN(paid) || paid <= 0) {
            addToast('Montant invalide', 'error');
            return;
        }
        try {
            await payDepositPartial(leaseId, paid);
            const newTotal = alreadyPaid + paid;
            addToast(newTotal >= amount ? `Caution complète reçue` : `Versement de ${paid.toFixed(2)} € enregistré (total: ${newTotal.toFixed(2)} €)`, 'success');
        } catch {
            addToast('Erreur lors de l\'enregistrement', 'error');
        }
        setPartialMode(false);
        setPartialAmount('');
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => { setOpen(!open); setPartialMode(false); }}
                style={{
                    padding: '0.25rem 0.75rem',
                    background: `${current.color}20`,
                    color: current.color,
                    border: `1px solid ${current.color}40`,
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                }}
            >
                {current.icon} {current.label} ({amount.toFixed(0)}€)
            </button>

            {partialMode && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '0.25rem',
                    background: '#1a1f36',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    zIndex: 100,
                    minWidth: '200px',
                    boxShadow: 'var(--shadow-lg)',
                }}>
                    <p style={{ fontSize: '0.8rem', color: '#f97316', marginBottom: '0.25rem', fontWeight: 600 }}>
                        💰 Nouveau versement
                    </p>
                    {alreadyPaid > 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            Déjà perçu : {alreadyPaid.toFixed(2)} € / {amount.toFixed(0)} € · Solde : {remaining.toFixed(2)} €
                        </p>
                    )}
                    <input
                        type="number"
                        min="0.01"
                        max={remaining > 0 ? remaining : amount}
                        step="0.01"
                        value={partialAmount}
                        onChange={e => setPartialAmount(e.target.value)}
                        placeholder={alreadyPaid > 0 ? `Solde : ${remaining.toFixed(2)} €` : `0 – ${amount.toFixed(0)} €`}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '0.4rem 0.5rem',
                            background: '#0f1729',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            marginBottom: '0.5rem',
                            boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                            onClick={handlePartialSubmit}
                            style={{ flex: 1, padding: '0.35rem', background: '#f97316', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}
                        >
                            Enregistrer
                        </button>
                        <button
                            onClick={() => { setPartialMode(false); setPartialAmount(''); }}
                            style={{ padding: '0.35rem 0.6rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {open && !partialMode && (
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
