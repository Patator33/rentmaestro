import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
// import { deleteApartment } from "@/actions/apartments"; // Removed as now handled by client component
import DeleteApartmentButton from "@/components/DeleteApartmentButton";

export const dynamic = "force-dynamic";

export default async function ApartmentsPage() {
    const apartments = await prisma.apartment.findMany({
        include: {
            leases: {
                orderBy: { endDate: 'desc' },
                include: { tenant: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Mes Appartements</h1>
                <Link href="/apartments/new" className="std-add-button">
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
                        const activeLease = apt.leases.find(l => l.isActive);
                        const lastLease = apt.leases[0];
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
                                            {lastLease?.endDate && (
                                                <span style={{ fontSize: '0.8em', opacity: 0.8, fontWeight: 400 }}>
                                                    depuis le {lastLease.endDate.toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.tenantBadge}>
                                            👤
                                            <Link href={`/tenants/${activeLease?.tenant.id}`} className="hover:underline">
                                                {activeLease?.tenant.firstName} {activeLease?.tenant.lastName}
                                            </Link>
                                            {activeLease && (
                                                <span style={{ fontSize: '0.8em', opacity: 0.8, fontWeight: 400, marginLeft: 'auto' }}>
                                                    Du {activeLease.startDate.toLocaleDateString()}
                                                    {activeLease.endDate ? ` au ${activeLease.endDate.toLocaleDateString()}` : ' (En cours)'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardFooter}>
                                    <DeleteApartmentButton id={apt.id} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
