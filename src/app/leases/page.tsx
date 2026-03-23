import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import TerminateLeaseButton from "@/components/TerminateLeaseButton";
import DeleteLeaseButton from "@/components/DeleteLeaseButton";
import DepositStatusButton from "@/components/DepositStatusButton";
import ViewToggle from "@/components/ViewToggle";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SearchParams {
    view?: string;
}

export default async function LeasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const view = params.view === 'list' ? 'list' : 'grid';

    const leases = await prisma.lease.findMany({
        include: {
            apartment: true,
            tenant: true,
        },
        orderBy: { apartment: { address: 'asc' } }
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

    const actionButtons = (lease: typeof leases[0]) => (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                ✏️
            </Link>
            <TerminateLeaseButton
                leaseId={lease.id}
                currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                style={{ background: 'transparent', color: lease.endDate ? 'var(--text-main)' : 'var(--error)', border: '1px solid var(--border-color)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}
                label={lease.endDate ? "📅" : "🚪"}
            />
            <DeleteLeaseButton id={lease.id} />
        </div>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Contrats de Location</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <ViewToggle currentView={view} />
                    <Link href="/leases/new" className="std-add-button">
                        + Nouveau Contrat
                    </Link>
                </div>
            </header>

            {leases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Aucun contrat enregistré.</p>
                </div>
            ) : view === 'list' ? (
                /* ── TABLE VIEW ── */
                <>
                    {futureLeases.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle} style={{ color: 'var(--accent-color)' }}>À Venir ({futureLeases.length})</h2>
                            <div className="table-container" style={{ marginBottom: '2rem' }}>
                                <table className="std-table">
                                    <thead>
                                        <tr>
                                            <th>Bien</th>
                                            <th>Locataire</th>
                                            <th>Début</th>
                                            <th>Fin</th>
                                            <th>Loyer HC</th>
                                            <th>Charges</th>
                                            <th>Caution</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {futureLeases.map((lease) => (
                                            <tr key={lease.id}>
                                                <td style={{ fontWeight: 600 }}>{lease.apartment.name || lease.apartment.address}</td>
                                                <td>
                                                    <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                                                        {lease.tenant.firstName} {lease.tenant.lastName}
                                                    </Link>
                                                </td>
                                                <td style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{formatDate(lease.startDate)}</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{lease.endDate ? formatDate(lease.endDate) : '—'}</td>
                                                <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</td>
                                                <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {lease.depositAmount ? `${lease.depositAmount.toFixed(2)} €` : '—'}
                                                </td>
                                                <td>{actionButtons(lease)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    <h2 className={styles.sectionTitle}>Contrats en Cours ({activeLeases.length})</h2>
                    {activeLeases.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '2rem' }}>Aucun bail actif aujourd'hui.</p>
                    ) : (
                        <div className="table-container" style={{ marginBottom: '2rem' }}>
                            <table className="std-table">
                                <thead>
                                    <tr>
                                        <th>Bien</th>
                                        <th>Locataire</th>
                                        <th>Début</th>
                                        <th>Fin prévue</th>
                                        <th>Loyer HC</th>
                                        <th>Charges</th>
                                        <th>CC</th>
                                        <th>Caution</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeLeases.map((lease) => (
                                        <tr key={lease.id}>
                                            <td style={{ fontWeight: 600 }}>{lease.apartment.name || lease.apartment.address}</td>
                                            <td>
                                                <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                                                    {lease.tenant.firstName} {lease.tenant.lastName}
                                                </Link>
                                            </td>
                                            <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formatDate(lease.startDate)}</td>
                                            <td style={{ fontSize: '0.875rem', color: lease.endDate ? 'var(--warning)' : 'var(--text-muted)' }}>
                                                {lease.endDate ? formatDate(lease.endDate) : '—'}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{lease.rentAmount.toFixed(2)} €</td>
                                            <td>{lease.chargesAmount.toFixed(2)} €</td>
                                            <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                                                {(lease.rentAmount + lease.chargesAmount).toFixed(2)} €
                                            </td>
                                            <td>
                                                {lease.depositAmount ? (
                                                    <DepositStatusButton
                                                        leaseId={lease.id}
                                                        currentStatus={lease.depositStatus}
                                                        amount={lease.depositAmount}
                                                    />
                                                ) : '—'}
                                            </td>
                                            <td>{actionButtons(lease)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pastLeases.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle}>Historique ({pastLeases.length})</h2>
                            <div className="table-container">
                                <table className="std-table">
                                    <thead>
                                        <tr>
                                            <th>Bien</th>
                                            <th>Locataire</th>
                                            <th>Début</th>
                                            <th>Fin</th>
                                            <th>Loyer HC</th>
                                            <th>Charges</th>
                                            <th>CC</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastLeases.map((lease) => (
                                            <tr key={lease.id} style={{ opacity: 0.7 }}>
                                                <td style={{ fontWeight: 600 }}>{lease.apartment.name || lease.apartment.address}</td>
                                                <td>{lease.tenant.firstName} {lease.tenant.lastName}</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formatDate(lease.startDate)}</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{lease.endDate ? formatDate(lease.endDate) : '—'}</td>
                                                <td>{lease.rentAmount.toFixed(2)} €</td>
                                                <td>{lease.chargesAmount.toFixed(2)} €</td>
                                                <td>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td>
                                                <td>{actionButtons(lease)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            ) : (
                /* ── GRID VIEW ── */
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

                                    if (start.getDate() > 1) {
                                        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                                        const daysRemaining = daysInMonth - start.getDate() + 1;
                                        const totalRent = lease.rentAmount + lease.chargesAmount;
                                        const prorata = (totalRent / daysInMonth) * daysRemaining;

                                        rentDisplay = (
                                            <div className={styles.rent} style={{ border: '1px solid #f9a8d4', background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '1.2rem' }}>
                                                {prorata.toFixed(2)} € <span style={{ fontSize: '0.6em', fontWeight: 'normal', display: 'block' }}>Prorata 1er mois ({daysRemaining}j)</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={lease.id} className={styles.card} style={{ borderColor: 'var(--accent-color)', background: 'rgba(255, 165, 0, 0.05)' }}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.statusBadge} style={{ background: 'rgba(255, 165, 0, 0.15)', color: 'var(--accent-color)' }}>À VENIR</span>
                                                <h3 className={styles.cardTitle}>{lease.apartment.name || lease.apartment.address}</h3>
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
                                            <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                                                <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                                                    ✏️ Modifier
                                                </Link>
                                                <TerminateLeaseButton
                                                    leaseId={lease.id}
                                                    currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                    label="Dates"
                                                    style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                                                />
                                                <DeleteLeaseButton id={lease.id} />
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
                                const todayLocal = new Date();
                                const totalRent = lease.rentAmount + lease.chargesAmount;

                                let rentDisplay = (
                                    <div className={styles.rent}>
                                        {totalRent.toFixed(2)} € <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>/ mois CC</span>
                                    </div>
                                );

                                if (todayLocal.getMonth() === start.getMonth() && todayLocal.getFullYear() === start.getFullYear() && start.getDate() > 1) {
                                    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                                    const daysRemaining = daysInMonth - start.getDate() + 1;
                                    const prorata = (totalRent / daysInMonth) * daysRemaining;
                                    rentDisplay = (
                                        <div className={styles.rent} style={{ border: '1px solid #f9a8d4', background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '1.2rem' }}>
                                            {prorata.toFixed(2)} € <span style={{ fontSize: '0.6em', fontWeight: 'normal', display: 'block' }}>Prorata début ({daysRemaining}j)</span>
                                        </div>
                                    );
                                } else if (end && todayLocal.getMonth() === end.getMonth() && todayLocal.getFullYear() === end.getFullYear()) {
                                    const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
                                    const daysPresent = end.getDate();
                                    const prorata = (totalRent / daysInMonth) * daysPresent;
                                    rentDisplay = (
                                        <div className={styles.rent} style={{ border: '1px solid #f9a8d4', background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '1.2rem' }}>
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
                                            <h3 className={styles.cardTitle} style={{ marginTop: '0.5rem' }}>{lease.apartment.name || lease.apartment.address}</h3>
                                            <p className={styles.cardSubtitle}>
                                                <Link href={`/tenants/${lease.tenant.id}`} className="hover:underline">
                                                    {lease.tenant.firstName} {lease.tenant.lastName}
                                                </Link>
                                            </p>
                                        </div>
                                        <div className={styles.info}>
                                            {rentDisplay}
                                            <span className={styles.date}>Début: {formatDate(lease.startDate)}</span>
                                            {lease.depositAmount && (
                                                <DepositStatusButton
                                                    leaseId={lease.id}
                                                    currentStatus={lease.depositStatus}
                                                    amount={lease.depositAmount}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                                            <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                                                ✏️ Modifier
                                            </Link>
                                            <TerminateLeaseButton
                                                leaseId={lease.id}
                                                currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                style={{ background: 'transparent', color: lease.endDate ? 'var(--text-main)' : 'var(--error)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', cursor: 'pointer' }}
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
                                            <h3 className={styles.cardTitle}>{lease.apartment.name || lease.apartment.address}</h3>
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
                                        <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                                            <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', opacity: 0.7 }}>
                                                ✏️ Modifier
                                            </Link>
                                            <DeleteLeaseButton id={lease.id} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
