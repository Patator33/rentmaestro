'use client';

import { terminateLease } from "@/actions/leases";
import { useState } from "react";

export default function TerminateLeaseButton({ leaseId, className, style, currentEndDate, label }: { leaseId: string, className?: string, style?: React.CSSProperties, currentEndDate?: string, label?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDateInput, setShowDateInput] = useState(false);
    // Default to current End Date if exists, otherwise today
    const [endDate, setEndDate] = useState(currentEndDate || new Date().toISOString().split('T')[0]);

    const handleInitialClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission if inside a form
        setShowDateInput(true);
    };

    const handleConfirm = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (!endDate) {
            alert("Veuillez sélectionner une date.");
            return;
        }

        if (window.confirm(`Confirmer la fin du bail au ${new Date(endDate).toLocaleDateString()} ?`)) {
            setIsLoading(true);
            try {
                await terminateLease(leaseId, endDate);
                setShowDateInput(false);
            } catch (error) {
                console.error("Erreur lors de la clôture du bail:", error);
                alert("Erreur lors de la clôture du bail.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowDateInput(false);
    };

    if (showDateInput) {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-active)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem'
                    }}
                />
                <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                    }}
                >
                    OK
                </button>
                <button
                    onClick={handleCancel}
                    style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer'
                    }}
                >
                    ✖
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleInitialClick}
            className={className}
            style={style || {
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            {isLoading ? "..." : (label || "Terminer")}
        </button>
    );
}
