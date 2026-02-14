import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { deleteLease } from "@/actions/leases";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
    const leases = await prisma.lease.findMany({
        include: {
            apartment: true,
            tenant: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Contrats de Location</h1>
                <Link href="/leases/new" className={styles.addButton}>
                    + Nouveau Contrat
                </Link>
            </header>

            {leases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Aucun contrat actif. Liez un locataire à un appartement.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {leases.map((lease) => (
                        <div key={lease.id} className={styles.card}>
                            <div className="cardHeader">
                                <h3 className={styles.cardTitle}>{lease.apartment.address}</h3>
                                <p className={styles.cardSubtitle}>Locataire: {lease.tenant.firstName} {lease.tenant.lastName}</p>
                            </div>

                            <div className={styles.info}>
                                <div className={styles.rent}>
                                    {(lease.rentAmount + lease.chargesAmount).toFixed(2)} € <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>/ mois CC</span>
                                </div>
                                <span className={styles.date}>Début: {lease.startDate.toLocaleDateString()}</span>
                            </div>

                            <div className={styles.cardFooter}>
                                <form action={deleteLease.bind(null, lease.id)}>
                                    <button type="submit" className={styles.deleteButton}>Terminer / Supprimer</button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
