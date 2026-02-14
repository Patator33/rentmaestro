'use client';

import { terminateLease } from "@/actions/leases";
import { useState } from "react";

export default function TerminateLeaseButton({
    leaseId,
    className,
    style,
    currentEndDate,
    label
}: {
    leaseId: string,
    className?: string,
    style?: React.CSSProperties,
    currentEndDate?: string,
    label?: string
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDateInput, setShowDateInput] = useState(false);
    // Default to current End Date if exists, otherwise today
    const [endDate, setEndDate] = useState(currentEndDate || new Date().toISOString().split('T')[0]);

    const handleInitialClick = (e: React.MouseEvent) => {
        e.preventDefault();
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
                console.error("Erreur lors de la mise à jour du bail:", error);
                alert("Une erreur est survenue.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCancelTermination = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (window.confirm("Voulez-vous vraiment annuler la fin de ce bail ? Il restera actif indéfiniment.")) {
            setIsLoading(true);
            try {
                await terminateLease(leaseId, null);
                setShowDateInput(false);
            } catch (error) {
                console.error("Erreur lors de l'annulation:", error);
                alert("Une erreur est survenue.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleClose = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowDateInput(false);
    };

    if (showDateInput) {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--surface-active)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-color)'
            }}>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    title="Valider la nouvelle date"
                    style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    OK
                </button>

                {currentEndDate && (
                    <button
                        onClick={handleCancelTermination}
                        disabled={isLoading}
                        title="Annuler la fin du bail (Garder le locataire)"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--error)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        🗑️
                    </button>
                )}

                <button
                    onClick={handleClose}
                    style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        marginLeft: '0.25rem'
                    }}
                >
                    ✖
                </button>
            </div>
        );
    }

    // Default view (Button)

    // If we have an end date, show a "Edit" style button
    if (currentEndDate) {
        return (
            <button
                onClick={handleInitialClick}
                className={className}
                title={`Fin prévue le ${new Date(currentEndDate).toLocaleDateString()}`}
                style={style || {
                    background: 'transparent', // Ensure transparent background
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    opacity: 0.8
                }}
            >
                {isLoading ? "..." : (
                    <>
                        <span>🗓️ {label || "Modifier"}</span>
                    </>
                )}
            </button>
        );
    }

    // Standard "Terminate" button for active leases
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
