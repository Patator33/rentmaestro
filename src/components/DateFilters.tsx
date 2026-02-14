'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './DateFilters.module.css';

export default function DateFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (start) setStartDate(start);
        if (end) setEndDate(end);
    }, [searchParams]);

    const applyFilters = () => {
        const params = new URLSearchParams();
        if (startDate) params.set('start', startDate);
        if (endDate) params.set('end', endDate);
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

        const params = new URLSearchParams();
        params.set('start', startStr);
        params.set('end', endStr);
        router.push(`/stats?${params.toString()}`);
    };

    return (
        <div className={styles.filters}>
            <div className={styles.dateInputs}>
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
                <button onClick={applyFilters} className={styles.applyButton}>
                    Appliquer
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
