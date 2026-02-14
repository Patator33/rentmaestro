import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { deleteApartment } from "@/actions/apartments";

export const dynamic = "force-dynamic";

export default async function ApartmentsPage() {
    const apartments = await prisma.apartment.findMany({
        include: {
            leases: {
                where: { isActive: true },
                include: { tenant: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Mes Appartements</h1>
                <Link href="/apartments/new" className={styles.addButton}>
                    + Ajouter un bien
                </Link>
            </header>

            {apartments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Aucun appartement enregistré. Commencez par en ajouter un.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {apartments.map((apt) => {
                        const activeLease = apt.leases[0];
                        const isVacant = !activeLease;

                        return (
                            <div key={apt.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.cardTitle}>
                                        <Link href={`/apartments/${apt.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            {apt.name || apt.address} &rarr;
                                        </Link>
                                    </h2>
                                    <p className={styles.cardSubtitle}>
                                        {apt.name ? `📍 ${apt.address} •` : ''} {apt.city} {apt.zipCode}
                                    </p>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Loyer:</span>
                                        <span className={styles.value}>{apt.rent.toFixed(2)} €</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Charges:</span>
                                        <span className={styles.value}>{apt.charges.toFixed(2)} €</span>
                                    </div>
                                    {apt.complement && (
                                        <div className={styles.infoRow}>
                                            <span className={styles.label}>Complément:</span>
                                            <span className={styles.value}>{apt.complement}</span>
                                        </div>
                                    )}
                                    {isVacant ? (
                                        <div className={styles.vacantBadge}>
                                            🔓 Vacant
                                        </div>
                                    ) : (
                                        <div className={styles.tenantBadge}>
                                            👤 {activeLease.tenant.firstName} {activeLease.tenant.lastName}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardFooter}>
                                    <form action={deleteApartment.bind(null, apt.id)}>
                                        <button type="submit" className={styles.deleteButton}>Supprimer</button>
                                    </form>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
