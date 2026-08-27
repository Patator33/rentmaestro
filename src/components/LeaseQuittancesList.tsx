'use client';

import { useState } from 'react';

interface QuittanceDTO {
    paymentId: string;
    period: string; // ISO date, 1er du mois
    amount: number;
}

export default function LeaseQuittancesList({ quittances }: { quittances: QuittanceDTO[] }) {
    const byYear = new Map<number, QuittanceDTO[]>();
    for (const q of quittances) {
        const year = new Date(q.period).getFullYear();
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(q);
    }
    const years = Array.from(byYear.keys()).sort((a, b) => b - a);

    const [openYears, setOpenYears] = useState<Set<number>>(() => new Set(years.slice(0, 1)));

    const toggleYear = (year: number) => {
        setOpenYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) next.delete(year);
            else next.add(year);
            return next;
        });
    };

    if (years.length === 0) {
        return <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucune quittance disponible pour le moment.</p>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {years.map(year => {
                const open = openYears.has(year);
                const items = byYear.get(year)!;
                return (
                    <div key={year} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <button
                            onClick={() => toggleYear(year)}
                            style={{
                                all: 'unset', display: 'flex', width: '100%', boxSizing: 'border-box',
                                justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                                padding: '0.6rem 0.9rem', background: 'var(--surface-active)',
                                fontWeight: 600, fontSize: '0.9rem',
                            }}
                            aria-expanded={open}
                        >
                            <span>{year}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>
                                {items.length} quittance{items.length > 1 ? 's' : ''} {open ? '▲' : '▼'}
                            </span>
                        </button>
                        {open && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {items.map(q => (
                                    <a
                                        key={q.paymentId}
                                        href={`/api/quittance/${q.paymentId}/pdf`}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.55rem 0.9rem', borderTop: '1px solid var(--border-color)',
                                            textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.85rem',
                                        }}
                                    >
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {new Date(q.period).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <strong>{q.amount.toFixed(2)} €</strong>
                                            <span style={{ color: 'var(--primary-color)' }}>📥</span>
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
