import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { deleteLease } from "@/actions/leases";
import TerminateLeaseButton from "@/components/TerminateLeaseButton";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeasesPage() {
    const leases = await prisma.lease.findMany({
        include: {
            apartment: true,
            tenant: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureLeases = leases.filter(l => new Date(l.startDate) > today);
    const activeLeases = leases.filter(l => {
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : null;
        return start <= today && (!end || end >= today);
    });
    const pastLeases = leases.filter(l => {
        const end = l.endDate ? new Date(l.endDate) : null;
        return end !== null && end < today && new Date(l.startDate) <= today;
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Contrats de Location</h1>
                <Link href="/leases/new" className="std-add-button">
                    + Nouveau Contrat
                </Link>
            </header>

            {leases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Aucun contrat enregistré.</p>
                </div>
            ) : (
                <>
                    {/* BAUX FUTURS */}
                    {futureLeases.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle} style={{ color: 'var(--accent-color)' }}>À Venir ({futureLeases.length})</h2>
                            <div className={styles.grid}>
                                {futureLeases.map((lease) => {
                                    const start = new Date(lease.startDate);
                                    let rentDisplay = (
                                        <div className={styles.rent}>
                                            {(lease.rentAmount + lease.chargesAmount).toFixed(2)} € <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>/ mois CC</span>
                                        </div>
                                    );

                                    // Check for start prorata (if not 1st of month)
                                    if (start.getDate() > 1) {
                                        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                                        const daysRemaining = daysInMonth - start.getDate() + 1;
                                        const totalRent = lease.rentAmount + lease.chargesAmount;
                                        const prorata = (totalRent / daysInMonth) * daysRemaining;

                                        rentDisplay = (
                                            <div className={styles.rent} style={{
                                                border: '1px solid #f9a8d4',
                                                background: 'rgba(236, 72, 153, 0.1)',
                                                color: '#db2777',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '1.2rem'
                                            }}>
                                                {prorata.toFixed(2)} € <span style={{ fontSize: '0.6em', fontWeight: 'normal', display: 'block' }}>Prorata 1er mois ({daysRemaining}j)</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={lease.id} className={styles.card} style={{ borderColor: 'var(--accent-color)', background: 'rgba(255, 165, 0, 0.05)' }}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.statusBadge} style={{ background: 'rgba(255, 165, 0, 0.15)', color: 'var(--accent-color)' }}>À VENIR</span>
                                                <h3 className={styles.cardTitle}>{lease.apartment.address}</h3>
                                                <p className={styles.cardSubtitle}>
                                                    Locataire : <Link href={`/tenants/${lease.tenant.id}`} className="hover:underline">{lease.tenant.firstName} {lease.tenant.lastName}</Link>
                                                </p>
                                            </div>
                                            <div className={styles.info}>
                                                {rentDisplay}
                                                <span className={styles.date}>Début : {formatDate(lease.startDate)}</span>
                                                {lease.endDate && (
                                                    <span className={styles.date} style={{ opacity: 0.8 }}>Fin : {formatDate(lease.endDate)}</span>
                                                )}
                                            </div>
                                            <div className={styles.cardFooter}>
                                                <TerminateLeaseButton
                                                    leaseId={lease.id}
                                                    currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                    label="Modifier dates"
                                                    style={{ marginRight: 'auto', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                                                />
                                                <form action={deleteLease.bind(null, lease.id)}>
                                                    <button type="submit" className={styles.deleteButton} title="Supprimer">Supprimer</button>
                                                </form>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* BAUX ACTIFS */}
                    <h2 className={styles.sectionTitle}>Contrats en Cours ({activeLeases.length})</h2>
                    {activeLeases.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '2rem' }}>Aucun bail actif aujourd'hui.</p>
                    ) : (
                        <div className={styles.grid}>
                            {activeLeases.map((lease) => {
                                const start = new Date(lease.startDate);
                                const end = lease.endDate ? new Date(lease.endDate) : null;
                                const today = new Date();
                                const totalRent = lease.rentAmount + lease.chargesAmount;

                                let rentDisplay = (
                                    <div className={styles.rent}>
                                        {totalRent.toFixed(2)} € <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>/ mois CC</span>
                                    </div>
                                );

                                // Check for Start Prorata (Current month is start month AND start > 1st)
                                if (today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear() && start.getDate() > 1) {
                                    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                                    const daysRemaining = daysInMonth - start.getDate() + 1;
                                    const prorata = (totalRent / daysInMonth) * daysRemaining;

                                    rentDisplay = (
                                        <div className={styles.rent} style={{
                                            border: '1px solid #f9a8d4',
                                            background: 'rgba(236, 72, 153, 0.1)',
                                            color: '#db2777',
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '1.2rem'
                                        }}>
                                            {prorata.toFixed(2)} € <span style={{ fontSize: '0.6em', fontWeight: 'normal', display: 'block' }}>Prorata début ({daysRemaining}j)</span>
                                        </div>
                                    );
                                }
                                // Check for End Prorata (Current month is end month)
                                else if (end && today.getMonth() === end.getMonth() && today.getFullYear() === end.getFullYear()) {
                                    const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
                                    const daysPresent = end.getDate();
                                    const prorata = (totalRent / daysInMonth) * daysPresent;

                                    rentDisplay = (
                                        <div className={styles.rent} style={{
                                            border: '1px solid #f9a8d4',
                                            background: 'rgba(236, 72, 153, 0.1)',
                                            color: '#db2777',
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '1.2rem'
                                        }}>
                                            {prorata.toFixed(2)} € <span style={{ fontSize: '0.6em', fontWeight: 'normal', display: 'block' }}>Prorata fin ({daysPresent}j)</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={lease.id} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <span className={`${styles.statusBadge} ${styles.statusActive}`}>ACTIF</span>
                                                {lease.endDate && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, background: 'rgba(255, 165, 0, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                        Fin le {formatDate(lease.endDate)}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={styles.cardTitle} style={{ marginTop: '0.5rem' }}>{lease.apartment.address}</h3>
                                            <p className={styles.cardSubtitle}>
                                                <Link href={`/tenants/${lease.tenant.id}`} className="hover:underline">
                                                    {lease.tenant.firstName} {lease.tenant.lastName}
                                                </Link>
                                            </p>
                                        </div>

                                        <div className={styles.info}>
                                            {rentDisplay}
                                            <span className={styles.date}>Début: {formatDate(lease.startDate)}</span>
                                        </div>

                                        <div className={styles.cardFooter}>
                                            <TerminateLeaseButton
                                                leaseId={lease.id}
                                                currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                style={{
                                                    background: 'transparent',
                                                    color: lease.endDate ? 'var(--text-main)' : 'var(--error)',
                                                    border: '1px solid var(--border-color)',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.875rem',
                                                    cursor: 'pointer'
                                                }}
                                                label={lease.endDate ? "Modifier fin" : "Terminer"}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* HISTORIQUE */}
                    {pastLeases.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle}>Historique ({pastLeases.length})</h2>
                            <div className={styles.grid}>
                                {pastLeases.map((lease) => (
                                    <div key={lease.id} className={styles.historyCard}>
                                        <div className={styles.cardHeader}>
                                            <span className={`${styles.statusBadge} ${styles.statusInactive}`}>TERMINÉ</span>
                                            <h3 className={styles.cardTitle}>{lease.apartment.address}</h3>
                                            <p className={styles.cardSubtitle}>
                                                {lease.tenant.firstName} {lease.tenant.lastName}
                                            </p>
                                        </div>

                                        <div className={styles.info}>
                                            <div className={styles.rent}>
                                                {(lease.rentAmount + lease.chargesAmount).toFixed(2)} € <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>/ mois CC</span>
                                            </div>
                                            <span className={styles.date}>
                                                Du {formatDate(lease.startDate)} au {lease.endDate ? formatDate(lease.endDate) : '?'}
                                            </span>
                                        </div>

                                        <div className={styles.cardFooter}>
                                            <TerminateLeaseButton
                                                leaseId={lease.id}
                                                currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                style={{ marginRight: 'auto', fontSize: '0.8rem', opacity: 0.5 }}
                                                label="Modifier"
                                            />
                                            <form action={deleteLease.bind(null, lease.id)}>
                                                <button type="submit" className={styles.deleteButton} title="Supprimer de l'historique">Supprimer</button>
                                            </form>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div >
    );
}
