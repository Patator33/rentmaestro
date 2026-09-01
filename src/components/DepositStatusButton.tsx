'use client';

import React, { useState } from 'react';
import { updateDepositStatus } from '@/actions/management';
import { payDepositPartial, returnDeposit } from '@/actions/leases';
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
    depositReturnedAmount?: number | null;
    depositReturnNote?: string | null;
}

export default function DepositStatusButton({ leaseId, currentStatus, amount, depositPaidAmount, depositReturnedAmount, depositReturnNote }: DepositStatusButtonProps) {
    const [open, setOpen] = useState(false);
    const [partialMode, setPartialMode] = useState(false);
    const [partialAmount, setPartialAmount] = useState('');
    const [returnMode, setReturnMode] = useState<null | 'RETURNED' | 'DEDUCTED'>(null);
    const [returnAmount, setReturnAmount] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const { addToast } = useToast();

    if (!amount) return null;

    const alreadyPaid = depositPaidAmount ?? 0;
    const remaining = amount - alreadyPaid;

    const current = STATUS_LABELS[currentStatus || 'PENDING'];

    // Info-bulle au survol : montant restitué + annotation, pour l'historique des baux.
    let tooltip: string | undefined;
    if ((currentStatus === 'RETURNED' || currentStatus === 'DEDUCTED') && depositReturnedAmount != null) {
        const withheld = Math.max(0, amount - depositReturnedAmount);
        const lines = [`Restitué : ${depositReturnedAmount.toFixed(2)} € / ${amount.toFixed(2)} €`];
        if (withheld > 0.005) lines.push(`Retenu : ${withheld.toFixed(2)} €`);
        else lines.push('Restitution intégrale');
        if (depositReturnNote) lines.push(`Motif : ${depositReturnNote}`);
        tooltip = lines.join('\n');
    }

    const handleChange = async (newStatus: string) => {
        if (newStatus === 'PARTIAL_RECEIVED') {
            setOpen(false);
            setReturnMode(null);
            setPartialMode(true);
            return;
        }
        if (newStatus === 'RETURNED' || newStatus === 'DEDUCTED') {
            setOpen(false);
            setPartialMode(false);
            setReturnMode(newStatus);
            setReturnAmount(newStatus === 'DEDUCTED' ? '0' : amount.toFixed(2));
            setReturnNote(depositReturnNote ?? '');
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

    const handleReturnSubmit = async () => {
        if (!returnMode) return;
        const paid = parseFloat(returnAmount);
        if (isNaN(paid) || paid < 0) {
            addToast('Montant restitué invalide', 'error');
            return;
        }
        if (paid < amount && !returnNote.trim()) {
            addToast('Une annotation est requise pour une restitution incomplète', 'error');
            return;
        }
        try {
            const res = await returnDeposit(leaseId, returnMode, paid, returnNote.trim() || null);
            addToast(
                paid >= amount ? 'Caution restituée intégralement' : `Caution restituée : ${paid.toFixed(2)} € / ${amount.toFixed(2)} €`,
                'success',
            );
            if (res?.emailError) addToast(`Email non envoyé : ${res.emailError}`, 'error');
        } catch (e: any) {
            addToast(e?.message || 'Erreur lors de la restitution', 'error');
            return;
        }
        setReturnMode(null);
        setReturnNote('');
        setReturnAmount('');
    };

    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '0.25rem',
        background: '#1a1f36',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem',
        zIndex: 100,
        minWidth: '240px',
        boxShadow: 'var(--shadow-lg)',
    };
    const inputStyle: React.CSSProperties = {
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
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => { setOpen(!open); setPartialMode(false); setReturnMode(null); }}
                title={tooltip}
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
                <div style={{ ...panelStyle, minWidth: '200px' }}>
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
                        style={inputStyle}
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

            {returnMode && (
                <div style={panelStyle}>
                    <p style={{ fontSize: '0.8rem', color: STATUS_LABELS[returnMode].color, marginBottom: '0.4rem', fontWeight: 600 }}>
                        {STATUS_LABELS[returnMode].icon} {returnMode === 'DEDUCTED' ? 'Retenue totale de la caution' : 'Restituer la caution'}
                    </p>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                        Montant restitué (€) — caution : {amount.toFixed(2)} €
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={amount}
                        step="0.01"
                        value={returnAmount}
                        onChange={e => setReturnAmount(e.target.value)}
                        autoFocus
                        style={inputStyle}
                    />
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                        Annotation {parseFloat(returnAmount) < amount ? '(obligatoire)' : '(optionnelle)'}
                    </label>
                    <textarea
                        value={returnNote}
                        onChange={e => setReturnNote(e.target.value)}
                        rows={3}
                        placeholder="Ex : retenue pour remise en état du mur du salon"
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                            onClick={handleReturnSubmit}
                            style={{ flex: 1, padding: '0.35rem', background: STATUS_LABELS[returnMode].color, color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}
                        >
                            Confirmer
                        </button>
                        <button
                            onClick={() => { setReturnMode(null); setReturnNote(''); setReturnAmount(''); }}
                            style={{ padding: '0.35rem 0.6rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {open && !partialMode && !returnMode && (
                <div style={{ ...panelStyle, padding: '0.25rem', minWidth: '160px' }}>
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
