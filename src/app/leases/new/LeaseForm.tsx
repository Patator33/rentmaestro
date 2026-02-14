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
                    <input type="date" id="startDate" name="startDate" required className={styles.input} />
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

                <button type="submit" className={styles.submitButton}>Créer le contrat</button>
            </form>
        </div>
    );
}
