'use client';

import React, { useState, useTransition } from 'react';
import { markRentAsPaid } from '@/actions/rents';

interface Props {
    leaseId: string;
    periodStr: string;
    defaultAmount: number;       // full expected amount
    existingPaidAmount?: number; // already received (PARTIAL case)
    buttonStyle?: string;
}

export default function MarkRentPaidButton({ leaseId, periodStr, defaultAmount, existingPaidAmount, buttonStyle }: Props) {
    const remaining = defaultAmount - (existingPaidAmount ?? 0);
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState(remaining.toFixed(2));
    const [isPending, startTransition] = useTransition();

    const handleOpen = () => {
        setAmount(remaining.toFixed(2));
        setShowForm(true);
    };

    const parsedAmount = parseFloat(amount);
    const totalAfter = (existingPaidAmount ?? 0) + parsedAmount;
    const isPartial = !isNaN(parsedAmount) && parsedAmount > 0 && totalAfter < defaultAmount - 0.01;
    const solde = isPartial ? (defaultAmount - totalAfter).toFixed(2) : null;

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
                {existingPaidAmount != null && (
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                        Reçu : {existingPaidAmount.toFixed(2)} € / {defaultAmount.toFixed(2)} € attendu
                    </span>
                )}
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
                        style={{
                            background: isPartial ? 'var(--pill-warn-bg)' : 'var(--pill-ok-bg)',
                            borderColor: isPartial ? 'var(--pill-warn-border)' : 'var(--pill-ok-border)',
                            color: isPartial ? 'var(--pill-warn-color)' : 'var(--pill-ok-color)',
                            padding: '7px 12px',
                            opacity: isPending ? 0.6 : 1,
                        }}
                        title="Confirmer"
                    >
                        ✓
                    </button>
                    <button
                        onClick={() => setShowForm(false)}
                        disabled={isPending}
                        className={buttonStyle}
                        style={{
                            background: 'var(--pill-muted-bg)',
                            borderColor: 'var(--pill-muted-border)',
                            color: 'var(--pill-muted-color)',
                            padding: '7px 12px',
                        }}
                        title="Annuler"
                    >
                        ✕
                    </button>
                </span>
                {isPartial && solde && (
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                        Paiement partiel — Solde restant : {solde} €
                    </span>
                )}
            </span>
        );
    }

    return (
        // Les couleurs viennent de .paidButton (toujours composé dans buttonStyle
        // par les appelants) : plus besoin de les répéter ici en inline.
        <button onClick={handleOpen} className={buttonStyle}>
            {existingPaidAmount != null ? 'Compléter' : 'Marquer Payé'}
        </button>
    );
}
