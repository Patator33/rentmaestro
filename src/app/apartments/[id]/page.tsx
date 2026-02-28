import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import TerminateLeaseButton from "@/components/TerminateLeaseButton";
import { formatDate } from "@/lib/utils";
import ExpenseForm from "@/components/ExpenseForm";

export const dynamic = "force-dynamic";

export default async function ApartmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const apartment = await prisma.apartment.findUnique({
        where: { id },
        include: {
            leases: {
                include: {
                    tenant: true,
                    payments: true
                },
                orderBy: { startDate: 'desc' }
            },
            expenses: {
                orderBy: { date: 'desc' }
            }
        }
    });

    if (!apartment) {
        notFound();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className={styles.container}>
            <Link href="/apartments" className={styles.backLink}>
                ← Retour à la liste
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{apartment.address}</h1>
                    <p className={styles.subtitle}>{apartment.zipCode} {apartment.city}</p>
                </div>
                <Link href={`/apartments/${apartment.id}/edit`} className={styles.editButton}>
                    ✏️ Modifier
                </Link>
            </header>

            <section className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                    <span className={styles.label}>Loyer</span>
                    <span className={styles.value}>{apartment.rent.toFixed(2)} €</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.label}>Charges</span>
                    <span className={styles.value}>{apartment.charges.toFixed(2)} €</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.label}>Total</span>
                    <span className={styles.value}>{(apartment.rent + apartment.charges).toFixed(2)} €</span>
                </div>
                {apartment.complement && (
                    <div className={styles.detailItem}>
                        <span className={styles.label}>Complément</span>
                        <span className={styles.value}>{apartment.complement}</span>
                    </div>
                )}
                {apartment.comment && (
                    <div className={styles.detailItem} style={{ gridColumn: '1 / -1', marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span className={styles.label} style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-color)' }}>Commentaire interne (Privé)</span>
                        <span className={styles.value} style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{apartment.comment}</span>
                    </div>
                )}
            </section>

            <h2 className={styles.sectionTitle}>Historique des Locataires</h2>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Locataire</th>
                            <th>Début du bail</th>
                            <th>Fin du bail</th>
                            <th>Loyer (CC)</th>
                            <th>Perçu</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apartment.leases.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Aucun locataire enregistré pour cet appartement.
                                </td>
                            </tr>
                        ) : (
                            apartment.leases.map(lease => {
                                const start = new Date(lease.startDate);
                                const end = lease.endDate ? new Date(lease.endDate) : null;
                                let status: 'FUTURE' | 'ACTIVE' | 'PAST' = 'PAST';

                                if (start > today) status = 'FUTURE';
                                else if (!end || end >= today) status = 'ACTIVE';

                                return (
                                    <tr key={lease.id}>
                                        <td style={{ fontWeight: 500 }}>
                                            <Link href={`/tenants/${lease.tenant.id}`} className="hover:underline hover:text-primary">
                                                {lease.tenant.firstName} {lease.tenant.lastName}
                                            </Link>
                                        </td>
                                        <td>{formatDate(lease.startDate)}</td>
                                        <td>{lease.endDate ? formatDate(lease.endDate) : '-'}</td>
                                        <td>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td>
                                        <td style={{ color: '#15803d', fontWeight: 600 }}>
                                            {lease.payments
                                                .filter((p) => p.status === 'PAID')
                                                .reduce((acc, curr) => acc + curr.amount, 0)
                                                .toFixed(2)} €
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {status === 'FUTURE' && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-color)', background: 'rgba(255, 165, 0, 0.15)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>À VENIR</span>
                                                )}
                                                {status === 'ACTIVE' && (
                                                    <span className={styles.activeStatus} style={{ color: 'var(--success)' }}>EN COURS</span>
                                                )}
                                                {status === 'PAST' && (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>TERMINÉ</span>
                                                )}

                                                {status !== 'PAST' && (
                                                    <TerminateLeaseButton
                                                        leaseId={lease.id}
                                                        currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                        label={lease.endDate ? "Modifier" : "Terminer"}
                                                        className={lease.endDate ? styles.tableEditButton : undefined}
                                                        style={lease.endDate ? {} : undefined}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExpenseForm apartmentId={apartment.id} expenses={apartment.expenses} />
        </div>
    );
}
