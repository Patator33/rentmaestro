'use client'

import { useState, ChangeEvent } from 'react'
import Link from 'next/link'
import { createLease } from '@/actions/leases'
import styles from './page.module.css'
import type { Apartment, Tenant, Lease } from '@prisma/client'

// Define extended apartment type with leases relation
type ExtendedApartment = Apartment & {
    leases: (Lease & { tenant: Tenant })[]
}

interface LeaseFormProps {
    apartments: ExtendedApartment[]
    tenants: Tenant[]
}

export default function LeaseForm({ apartments, tenants }: LeaseFormProps) {
    const [rent, setRent] = useState<number | string>('');
    const [charges, setCharges] = useState<number | string>('');
    const [conflictingLease, setConflictingLease] = useState<(Lease & { tenant: Tenant }) | null>(null);
    const [terminateConflict, setTerminateConflict] = useState(true);

    const handleApartmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const aptId = e.target.value;
        const apt = apartments.find(a => a.id === aptId);

        if (apt) {
            setRent(apt.rent);
            setCharges(apt.charges);
            // Check for active lease
            // We consider 'active' if isActive is true OR if it overlaps (no end date or future end date)
            const conflict = apt.leases.find(l => {
                if (l.isActive) return true;
                const end = l.endDate ? new Date(l.endDate) : null;
                return !end || end > new Date(); // Active if no end date or end date is future
            });
            setConflictingLease(conflict || null);
            setTerminateConflict(!!conflict);
        } else {
            setRent('');
            setCharges('');
            setConflictingLease(null);
        }
    };

    const [startDate, setStartDate] = useState('');

    // Calculate prorata if start date is not the 1st of the month
    let prorataDisplay = null;
    if (startDate && rent && charges) {
        // Parse the date string "YYYY-MM-DD" to ensure local time interpretation
        const [y, m, d] = startDate.split('-').map(Number);

        if (d > 1) {
            // Get number of days in the specific month
            // new Date(y, m, 0) gives the last day of the month 'm' (1-indexed in Date constructor for day 0?) 
            // Actually: new Date(year, monthIndex + 1, 0) gives the last day of the monthIndex.
            // m is 1-indexed from split. So m is correct for monthIndex + 1? 
            // Example: 2024-02-15. m=2. new Date(2024, 2, 0) -> last day of Feb 2024 (29). Correct.
            const daysInMonth = new Date(y, m, 0).getDate();
            const daysRemaining = daysInMonth - d + 1; // Inclusive of start date

            const totalMonthly = Number(rent) + Number(charges);
            const prorataAmount = (totalMonthly / daysInMonth) * daysRemaining;

            prorataDisplay = (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem'
                }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>
                        📅 Prorata du premier mois ({daysRemaining} jours sur {daysInMonth})
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                        {prorataAmount.toFixed(2)} €
                        <span style={{ fontSize: '0.8em', fontWeight: 400, color: 'var(--text-secondary)' }}> (Loyer + Charges)</span>
                    </p>
                </div>
            );
        }
    }

    return (
        <div className={styles.container}>
            <Link href="/leases" className={styles.backLink}>
                ← Retour aux contrats
            </Link>
            <h1 className={styles.title}>Nouveau Contrat</h1>

            <form action={createLease} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="apartmentId" className={styles.label}>Appartement *</label>
                    <select
                        id="apartmentId"
                        name="apartmentId"
                        required
                        className={styles.select}
                        onChange={handleApartmentChange}
                        defaultValue=""
                    >
                        <option value="">Sélectionner un appartement</option>
                        {apartments.map((apt) => (
                            <option key={apt.id} value={apt.id}>
                                {apt.address} - {apt.city} ({apt.rent}€)
                                {apt.leases.length > 0 ? " (Occupé)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {conflictingLease && (
                    <div style={{
                        backgroundColor: '#fff7ed',
                        border: '1px solid #fdba74',
                        color: '#9a3412',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                            ⚠️ Attention : Cet appartement est actuellement loué par {conflictingLease.tenant.lastName} {conflictingLease.tenant.firstName}.
                        </p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="terminateLeaseId"
                                value={conflictingLease.id}
                                checked={terminateConflict}
                                onChange={(e) => setTerminateConflict(e.target.checked)}
                                style={{ width: '1rem', height: '1rem', accentColor: '#c2410c' }}
                            />
                            Clôturer le bail actuel (Fin : Veille du nouveau contrat)
                        </label>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label htmlFor="tenantId" className={styles.label}>Locataire *</label>
                    <select id="tenantId" name="tenantId" required className={styles.select} defaultValue="">
                        <option value="">Sélectionner un locataire</option>
                        {tenants.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.lastName.toUpperCase()} {t.firstName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="startDate" className={styles.label}>Date de début *</label>
                    <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        required
                        className={styles.input}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="rentAmount" className={styles.label}>Loyer (HC) *</label>
                        <input
                            type="number"
                            step="0.01"
                            id="rentAmount"
                            name="rentAmount"
                            required
                            className={styles.input}
                            placeholder="Montant loyer"
                            value={rent}
                            onChange={(e) => setRent(e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="chargesAmount" className={styles.label}>Charges *</label>
                        <input
                            type="number"
                            step="0.01"
                            id="chargesAmount"
                            name="chargesAmount"
                            required
                            className={styles.input}
                            placeholder="Montant charges"
                            value={charges}
                            onChange={(e) => setCharges(e.target.value)}
                        />
                    </div>
                </div>

                {prorataDisplay}

                <button type="submit" className={styles.submitButton}>Créer le contrat</button>
            </form>
        </div>
    );
}
