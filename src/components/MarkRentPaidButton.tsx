'use client';

import React, { useState, useTransition } from 'react';
import { markRentAsPaid } from '@/actions/rents';

interface Props {
    leaseId: string;
    periodStr: string;
    defaultAmount: number;
    buttonStyle?: string;
}

export default function MarkRentPaidButton({ leaseId, periodStr, defaultAmount, buttonStyle }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState(defaultAmount.toFixed(2));
    const [isPending, startTransition] = useTransition();

    const handleOpen = () => {
        setAmount(defaultAmount.toFixed(2));
        setShowForm(true);
    };

    const parsedAmount = parseFloat(amount);
    const isPartial = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount < defaultAmount - 0.01;
    const remaining = isPartial ? (defaultAmount - parsedAmount).toFixed(2) : null;

    const handleConfirm = () => {
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        startTransition(async () => {
            await markRentAsPaid(leaseId, periodStr, parsedAmount);
            setShowForm(false);
        });
    };

    if (showForm) {
        return (
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setShowForm(false); }}
                        style={{ width: '85px', padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${isPartial ? '#f59e0b' : 'var(--primary-color)'}`, background: 'var(--background)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                        autoFocus
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>€</span>
                    <button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className={buttonStyle}
                        style={{ background: isPartial ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: isPartial ? '#f59e0b' : 'var(--success)', fontWeight: 700, padding: '0.25rem 0.5rem', opacity: isPending ? 0.6 : 1 }}
                        title="Confirmer"
                    >
                        ✓
                    </button>
                    <button
                        onClick={() => setShowForm(false)}
                        disabled={isPending}
                        className={buttonStyle}
                        style={{ padding: '0.25rem 0.5rem' }}
                        title="Annuler"
                    >
                        ✕
                    </button>
                </span>
                {isPartial && remaining && (
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                        Paiement partiel — Solde : {remaining} €
                    </span>
                )}
            </span>
        );
    }

    return (
        <button onClick={handleOpen} className={buttonStyle} style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>
            Marquer Payé
        </button>
    );
}
