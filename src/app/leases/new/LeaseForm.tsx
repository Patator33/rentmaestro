'use client'

import { useState, ChangeEvent } from 'react'
import Link from 'next/link'
import { createLease } from '@/actions/leases'
import styles from './page.module.css'
import DateInput from '@/components/DateInput'
import type { Apartment, Tenant, Lease } from '@prisma/client'

type GuarantorType = 'NONE' | 'PRIVATE' | 'VISALE'

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
    const [deposit, setDeposit] = useState<number | string>('');
    const [conflictingLease, setConflictingLease] = useState<(Lease & { tenant: Tenant }) | null>(null);
    const [terminateConflict, setTerminateConflict] = useState(true);

    const handleApartmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const aptId = e.target.value;
        const apt = apartments.find(a => a.id === aptId);

        if (apt) {
            setRent(apt.rent);
            setCharges(apt.charges);
            setDeposit((apt as any).defaultDeposit ?? apt.rent ?? '');
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
            setDeposit('');
            setConflictingLease(null);
        }
    };

    const [startDate, setStartDate] = useState('');
    const [guarantorType, setGuarantorType] = useState<GuarantorType>('NONE');

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
            const daysRemaining = daysInMonth - d; // Exclusive of start date

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
                                {apt.name || apt.address} - {apt.city} ({apt.rent}€)
                                {apt.leases.some(l => l.isActive) ? " (Occupé)" : ""}
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
                    <DateInput
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

                <div className={styles.formGroup}>
                    <label htmlFor="depositAmount" className={styles.label}>Dépôt de garantie (€)</label>
                    <input
                        type="number"
                        step="0.01"
                        id="depositAmount"
                        name="depositAmount"
                        className={styles.input}
                        placeholder="Montant du dépôt de garantie"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                    />
                </div>

                {prorataDisplay}

                {/* ── Garant ──────────────────────────────────────────── */}
                <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                    <label className={styles.label}>Garant</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {(['NONE', 'PRIVATE', 'VISALE'] as GuarantorType[]).map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${guarantorType === type ? 'var(--primary-color)' : 'var(--border-color)'}`, background: guarantorType === type ? 'rgba(163,230,53,0.08)' : 'transparent', fontSize: '0.9rem', transition: 'all 0.15s' }}>
                                <input type="radio" name="guarantorType" value={type} checked={guarantorType === type} onChange={() => setGuarantorType(type)} style={{ accentColor: 'var(--primary-color)' }} />
                                {type === 'NONE' ? 'Aucun' : type === 'PRIVATE' ? 'Garant privé' : 'Garantie Visale'}
                            </label>
                        ))}
                    </div>
                </div>

                {guarantorType === 'PRIVATE' && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informations du garant</p>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Prénom</label>
                                <input type="text" name="guarantorFirstName" className={styles.input} placeholder="Prénom du garant" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nom</label>
                                <input type="text" name="guarantorLastName" className={styles.input} placeholder="Nom du garant" />
                            </div>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email</label>
                                <input type="email" name="guarantorEmail" className={styles.input} placeholder="email@exemple.fr" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Téléphone</label>
                                <input type="tel" name="guarantorPhone" className={styles.input} placeholder="06 XX XX XX XX" />
                            </div>
                        </div>
                    </div>
                )}

                {guarantorType === 'VISALE' && (
                    <div style={{ background: 'rgba(103,232,249,0.06)', border: '1px solid rgba(103,232,249,0.25)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                        ℹ️ La garantie Visale sera notée sur le bail. Aucune information complémentaire requise.
                    </div>
                )}

                <button type="submit" className={styles.submitButton}>Créer le contrat</button>
            </form>
        </div>
    );
}
