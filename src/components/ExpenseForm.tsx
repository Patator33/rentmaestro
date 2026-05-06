'use client';

import { useRef } from 'react';
import { addExpense, deleteExpense } from '@/actions/management';
import { useToast } from './Toast';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    TAX: { label: 'Taxe foncière', icon: '🏛️', color: '#ef4444' },
    INSURANCE: { label: 'Assurance', icon: '🛡️', color: '#3b82f6' },
    MAINTENANCE: { label: 'Travaux / Entretien', icon: '🔧', color: '#f59e0b' },
    MANAGEMENT: { label: 'Frais de gestion', icon: '📊', color: '#8b5cf6' },
    OTHER: { label: 'Autre', icon: '📦', color: '#6b7280' },
};

interface Expense {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: Date;
    recurring: boolean;
}

interface ExpenseFormProps {
    apartmentId: string;
    expenses: Expense[];
}

export default function ExpenseForm({ apartmentId, expenses }: ExpenseFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const { addToast } = useToast();

    const handleSubmit = async (formData: FormData) => {
        try {
            await addExpense(formData);
            formRef.current?.reset();
            addToast('Dépense ajoutée', 'success');
        } catch {
            addToast('Erreur lors de l\'ajout', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteExpense(id);
            addToast('Dépense supprimée', 'info');
        } catch {
            addToast('Erreur lors de la suppression', 'error');
        }
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
                💰 Charges et Dépenses
                {totalExpenses > 0 && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--error)', marginLeft: '0.75rem' }}>
                        Total : {totalExpenses.toFixed(2)} €
                    </span>
                )}
            </h2>

            <form ref={formRef} action={handleSubmit} style={{
                display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end',
            }}>
                <input type="hidden" name="apartmentId" value={apartmentId} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Catégorie</label>
                    <select name="category" defaultValue="MAINTENANCE" style={{
                        padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontFamily: 'inherit',
                    }}>
                        {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                            <option key={key} value={key}>{val.icon} {val.label}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</label>
                    <input name="description" required placeholder="Remplacement chaudière..." style={{
                        padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontFamily: 'inherit',
                    }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Montant (€)</label>
                    <input name="amount" type="number" step="0.01" required style={{
                        padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontFamily: 'inherit',
                    }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</label>
                    <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} style={{
                        padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontFamily: 'inherit',
                    }} />
                </div>
                <button type="submit" className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    + Ajouter
                </button>
            </form>

            {expenses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {expenses.map(expense => {
                        const cat = CATEGORY_LABELS[expense.category] || CATEGORY_LABELS.OTHER;
                        return (
                            <div key={expense.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem', background: 'var(--surface)',
                                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                            }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
                                        background: `${cat.color}20`, color: cat.color, fontWeight: 600,
                                    }}>
                                        {cat.icon} {cat.label}
                                    </span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{expense.description}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--error)' }}>{expense.amount.toFixed(2)} €</span>
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}
                                        title="Supprimer"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
