'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateLease, deleteLease } from '@/actions/leases'
import styles from '@/app/leases/new/page.module.css'
import DateInput from '@/components/DateInput'
import DeleteButton from '@/components/DeleteButton'
import type { Apartment, Tenant, Lease } from '@prisma/client'

type GuarantorType = 'NONE' | 'PRIVATE' | 'VISALE'
type LeaseWithRelations = Lease & { apartment: Apartment; tenant: Tenant }

export default function EditLeaseForm({ lease }: { lease: LeaseWithRelations }) {
    const startDateStr = lease.startDate.toISOString().split('T')[0];
    const endDateStr = lease.endDate ? lease.endDate.toISOString().split('T')[0] : '';
    const [guarantorType, setGuarantorType] = useState<GuarantorType>(
        ((lease as any).guarantorType as GuarantorType) || 'NONE'
    );

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

                {/* ── Garant ──────────────────────────────────────────── */}
                <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
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
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informations du garant</p>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Prénom</label>
                                <input type="text" name="guarantorFirstName" className={styles.input} placeholder="Prénom" defaultValue={(lease as any).guarantorFirstName ?? ''} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nom</label>
                                <input type="text" name="guarantorLastName" className={styles.input} placeholder="Nom" defaultValue={(lease as any).guarantorLastName ?? ''} />
                            </div>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email</label>
                                <input type="email" name="guarantorEmail" className={styles.input} placeholder="email@exemple.fr" defaultValue={(lease as any).guarantorEmail ?? ''} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Téléphone</label>
                                <input type="tel" name="guarantorPhone" className={styles.input} placeholder="06 XX XX XX XX" defaultValue={(lease as any).guarantorPhone ?? ''} />
                            </div>
                        </div>
                    </div>
                )}

                {guarantorType === 'VISALE' && (
                    <div style={{ background: 'rgba(103,232,249,0.06)', border: '1px solid rgba(103,232,249,0.25)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                        ℹ️ La garantie Visale sera notée sur le bail. Aucune information complémentaire requise.
                    </div>
                )}

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
