'use client'

import Link from 'next/link'
import { updateLease } from '@/actions/leases'
import styles from '@/app/leases/new/page.module.css'
import type { Apartment, Tenant, Lease } from '@prisma/client'

type LeaseWithRelations = Lease & { apartment: Apartment; tenant: Tenant }

export default function EditLeaseForm({ lease }: { lease: LeaseWithRelations }) {
    const startDateStr = lease.startDate.toISOString().split('T')[0];
    const endDateStr = lease.endDate ? lease.endDate.toISOString().split('T')[0] : '';

    const action = updateLease.bind(null, lease.id);

    return (
        <div className={styles.container}>
            <Link href="/leases" className={styles.backLink}>
                ← Retour aux contrats
            </Link>
            <h1 className={styles.title}>Modifier le Contrat</h1>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>{lease.apartment.name || lease.apartment.address}</strong>
                {' · '}
                {lease.tenant.firstName} {lease.tenant.lastName}
            </div>

            <form action={action} className={styles.form}>
                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="startDate" className={styles.label}>Date de début *</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            required
                            defaultValue={startDateStr}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="endDate" className={styles.label}>Date de fin</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            defaultValue={endDateStr}
                            className={styles.input}
                        />
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.formGroup}>
                        <label htmlFor="rentAmount" className={styles.label}>Loyer HC (€) *</label>
                        <input
                            type="number"
                            step="0.01"
                            id="rentAmount"
                            name="rentAmount"
                            required
                            defaultValue={lease.rentAmount}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="chargesAmount" className={styles.label}>Charges (€) *</label>
                        <input
                            type="number"
                            step="0.01"
                            id="chargesAmount"
                            name="chargesAmount"
                            required
                            defaultValue={lease.chargesAmount}
                            className={styles.input}
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
                        defaultValue={lease.depositAmount ?? ''}
                        className={styles.input}
                        placeholder="Laisser vide si aucun dépôt"
                    />
                </div>

                <button type="submit" className={styles.submitButton}>
                    Enregistrer les modifications
                </button>
            </form>
        </div>
    );
}
