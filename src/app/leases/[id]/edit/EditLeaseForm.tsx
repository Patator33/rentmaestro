'use client'

import Link from 'next/link'
import { updateLease, deleteLease } from '@/actions/leases'
import styles from '@/app/leases/new/page.module.css'
import DateInput from '@/components/DateInput'
import DeleteButton from '@/components/DeleteButton'
import type { Apartment, Tenant, Lease } from '@prisma/client'

type LeaseWithRelations = Lease & { apartment: Apartment; tenant: Tenant }

export default function EditLeaseForm({ lease }: { lease: LeaseWithRelations }) {
    const startDateStr = lease.startDate.toISOString().split('T')[0];
    const endDateStr = lease.endDate ? lease.endDate.toISOString().split('T')[0] : '';

    const now = new Date();
    const nextMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const defaultEffectiveDate = `${nextMonthUTC.getUTCFullYear()}-${String(nextMonthUTC.getUTCMonth() + 1).padStart(2, '0')}`;

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
                        <DateInput
                            id="startDate"
                            name="startDate"
                            required
                            defaultValue={startDateStr}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="endDate" className={styles.label}>Date de fin</label>
                        <DateInput
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
                    <label htmlFor="rentEffectiveDate" className={styles.label}>
                        Date d'effet de la révision du loyer
                    </label>
                    <input
                        type="month"
                        id="rentEffectiveDate"
                        name="rentEffectiveDate"
                        defaultValue={defaultEffectiveDate}
                        className={styles.input}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Si le loyer est modifié, les paiements <strong>non payés</strong> à partir de cette date seront mis à jour au nouveau montant. Les loyers déjà payés (et leurs quittances) ne sont pas modifiés.
                    </p>
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
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <DeleteButton
                    deleteAction={deleteLease.bind(null, lease.id)}
                    confirmMessage={`Supprimer le bail de ${lease.tenant.firstName} ${lease.tenant.lastName} pour "${lease.apartment.name || lease.apartment.address}" ? Cette action est irréversible.`}
                    redirectTo="/leases"
                />
            </div>
        </div>
    );
}
