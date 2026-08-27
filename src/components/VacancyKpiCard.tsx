'use client';

import { useState } from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';
import styles from '@/app/stats/page.module.css';

interface VacancyPeriodDTO {
    apartmentLabel: string;
    start: string;
    end: string;
    days: number;
    lostAmount: number;
}

export default function VacancyKpiCard({
    rate,
    totalDays,
    periods,
}: {
    rate: string | number;
    totalDays: number;
    periods: VacancyPeriodDTO[];
}) {
    const [open, setOpen] = useState(false);
    const hasPeriods = periods.length > 0;

    return (
        <div className={styles.kpiCard} style={{ cursor: hasPeriods ? 'pointer' : 'default' }}>
            <button
                onClick={() => hasPeriods && setOpen(o => !o)}
                style={{
                    all: 'unset', display: 'block', width: '100%', cursor: hasPeriods ? 'pointer' : 'default',
                }}
                aria-expanded={open}
            >
                <div className={styles.kpiTitle}>🏖️ Taux de Vacance</div>
                <div className={styles.kpiValue}>{rate}%</div>
                <div className={styles.kpiSubtext}>
                    {totalDays} jours non loués{hasPeriods ? (open ? ' ▲' : ' ▼') : ''}
                </div>
            </button>

            {open && hasPeriods && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                                <th style={{ padding: '0.3rem 0.5rem 0.3rem 0' }}>Appartement</th>
                                <th style={{ padding: '0.3rem 0.5rem' }}>Début</th>
                                <th style={{ padding: '0.3rem 0.5rem' }}>Fin</th>
                                <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Jours</th>
                                <th style={{ padding: '0.3rem 0 0.3rem 0.5rem', textAlign: 'right' }}>Perte estimée</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map((p, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.4rem 0.5rem 0.4rem 0', color: 'var(--text-main)' }}>{p.apartmentLabel}</td>
                                    <td style={{ padding: '0.4rem 0.5rem' }}>{formatDate(p.start)}</td>
                                    <td style={{ padding: '0.4rem 0.5rem' }}>{formatDate(p.end)}</td>
                                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>{p.days}</td>
                                    <td style={{ padding: '0.4rem 0 0.4rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(p.lostAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
