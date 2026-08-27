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
        <>
            <div className={styles.kpiCard} style={{ cursor: hasPeriods ? 'pointer' : 'default' }}>
                <button
                    onClick={() => hasPeriods && setOpen(true)}
                    style={{ all: 'unset', display: 'block', width: '100%', cursor: hasPeriods ? 'pointer' : 'default' }}
                >
                    <div className={styles.kpiTitle}>🏖️ Taux de Vacance</div>
                    <div className={styles.kpiValue}>{rate}%</div>
                    <div className={styles.kpiSubtext}>{totalDays} jours non loués{hasPeriods ? ' — détail ↗' : ''}</div>
                </button>
            </div>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1.5rem', width: '100%', maxWidth: '820px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🏖️ Vacances locatives — {totalDays} jours ({rate}%)</h2>
                            <button
                                onClick={() => setOpen(false)}
                                style={{ all: 'unset', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-muted)', lineHeight: 1, padding: '0.25rem' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.4rem 0.6rem 0.4rem 0' }}>Appartement</th>
                                        <th style={{ padding: '0.4rem 0.6rem' }}>Début</th>
                                        <th style={{ padding: '0.4rem 0.6rem' }}>Fin</th>
                                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Jours</th>
                                        <th style={{ padding: '0.4rem 0 0.4rem 0.6rem', textAlign: 'right' }}>Perte estimée</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map((p, i) => (
                                        <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem 0.6rem 0.5rem 0', color: 'var(--text-main)' }}>{p.apartmentLabel}</td>
                                            <td style={{ padding: '0.5rem 0.6rem' }}>{formatDate(p.start)}</td>
                                            <td style={{ padding: '0.5rem 0.6rem' }}>{formatDate(p.end)}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{p.days}</td>
                                            <td style={{ padding: '0.5rem 0 0.5rem 0.6rem', textAlign: 'right', fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(p.lostAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
