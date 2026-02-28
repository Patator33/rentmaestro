'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './DateFilters.module.css';

interface Props {
    companies?: { id: string; name: string }[];
}

export default function DateFilters({ companies = [] }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [companyId, setCompanyId] = useState('');

    useEffect(() => {
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const comp = searchParams.get('companyId');

        if (start) setStartDate(start);
        if (end) setEndDate(end);
        if (comp) setCompanyId(comp);
    }, [searchParams]);

    const applyFilters = (presetStart?: string, presetEnd?: string, presetCompany?: string) => {
        const params = new URLSearchParams(searchParams.toString());

        const applyStart = presetStart !== undefined ? presetStart : startDate;
        const applyEnd = presetEnd !== undefined ? presetEnd : endDate;
        const applyComp = presetCompany !== undefined ? presetCompany : companyId;

        if (applyStart) params.set('start', applyStart);
        else params.delete('start');

        if (applyEnd) params.set('end', applyEnd);
        else params.delete('end');

        if (applyComp) params.set('companyId', applyComp);
        else params.delete('companyId');

        router.push(`/stats?${params.toString()}`);
    };

    const setPreset = (preset: 'month' | 'year' | 'rolling') => {
        const now = new Date();
        let start: Date;
        const end = now;

        switch (preset) {
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case 'rolling':
                start = new Date(now);
                start.setFullYear(start.getFullYear() - 1);
                break;
        }

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        setStartDate(startStr);
        setEndDate(endStr);
        applyFilters(startStr, endStr, companyId);
    };

    return (
        <div className={styles.filters}>
            <div className={styles.dateInputs}>
                {companies.length > 0 && (
                    <div className={styles.inputGroup}>
                        <label htmlFor="company">Entité propriétaire</label>
                        <select
                            id="company"
                            value={companyId}
                            onChange={(e) => {
                                setCompanyId(e.target.value);
                                applyFilters(startDate, endDate, e.target.value);
                            }}
                            className={styles.dateInput}
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="">Toutes (Global)</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className={styles.inputGroup}>
                    <label htmlFor="start">Du</label>
                    <input
                        type="date"
                        id="start"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="end">Au</label>
                    <input
                        type="date"
                        id="end"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
                <button onClick={() => applyFilters()} className={styles.applyButton}>
                    Filtrer
                </button>
            </div>

            <div className={styles.presets}>
                <button onClick={() => setPreset('month')} className={styles.presetButton}>
                    📅 Mois en cours
                </button>
                <button onClick={() => setPreset('year')} className={styles.presetButton}>
                    🗓️ Année en cours
                </button>
                <button onClick={() => setPreset('rolling')} className={styles.presetButton}>
                    🔄 Année glissante
                </button>
            </div>
        </div>
    );
}
