import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

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
            }
        }
    });

    if (!apartment) {
        notFound();
    }

    return (
        <div className={styles.container}>
            <Link href="/apartments" className={styles.backLink}>
                ← Retour à la liste
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>{apartment.address}</h1>
                <p className={styles.subtitle}>{apartment.zipCode} {apartment.city}</p>
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
            </section>

            <h2 className={styles.sectionTitle}>Historique des Locataires</h2>

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
                        apartment.leases.map(lease => (
                            <tr key={lease.id}>
                                <td style={{ fontWeight: 500 }}>
                                    {lease.tenant.firstName} {lease.tenant.lastName}
                                </td>
                                <td>{lease.startDate.toLocaleDateString()}</td>
                                <td>{lease.endDate ? lease.endDate.toLocaleDateString() : '-'}</td>
                                <td>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td>
                                <td style={{ color: '#15803d', fontWeight: 600 }}>
                                    {lease.payments
                                        .filter((p) => p.status === 'PAID')
                                        .reduce((acc, curr) => acc + curr.amount, 0)
                                        .toFixed(2)} €
                                </td>
                                <td>
                                    {lease.isActive ? (
                                        <span className={styles.activeStatus}>EN COURS</span>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Terminé</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
