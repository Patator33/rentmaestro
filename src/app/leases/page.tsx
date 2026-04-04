import React from "react";
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
    sort?: string;
    dir?: string;
}

export default async function LeasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const view = params.view === 'list' ? 'list' : 'grid';
    const sort = params.sort || 'apartment';
    const dir = params.dir === 'desc' ? 'desc' : 'asc';

    const allLeases = await prisma.lease.findMany({
        include: {
            apartment: true,
            tenant: true,
            documents: { select: { docType: true } },
        },
        orderBy: { apartment: { address: 'asc' } }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortLeases = (arr: typeof allLeases) => [...arr].sort((a, b) => {
        let av: string | number = '', bv: string | number = '';
        switch (sort) {
            case 'tenant':
                av = `${a.tenant.lastName} ${a.tenant.firstName}`.toLowerCase();
                bv = `${b.tenant.lastName} ${b.tenant.firstName}`.toLowerCase();
                break;
            case 'start':
                av = new Date(a.startDate).getTime();
                bv = new Date(b.startDate).getTime();
                break;
            case 'end':
                av = a.endDate ? new Date(a.endDate).getTime() : Infinity;
                bv = b.endDate ? new Date(b.endDate).getTime() : Infinity;
                break;
            case 'rent': av = a.rentAmount; bv = b.rentAmount; break;
            case 'charges': av = a.chargesAmount; bv = b.chargesAmount; break;
            case 'cc': av = a.rentAmount + a.chargesAmount; bv = b.rentAmount + b.chargesAmount; break;
            case 'deposit': av = a.depositAmount ?? 0; bv = b.depositAmount ?? 0; break;
            default:
                av = (a.apartment.name || a.apartment.address).toLowerCase();
                bv = (b.apartment.name || b.apartment.address).toLowerCase();
        }
        if (typeof av === 'string' && typeof bv === 'string')
            return dir === 'asc' ? av.localeCompare(bv, 'fr') : bv.localeCompare(av, 'fr');
        const na = av as number, nb = bv as number;
        return dir === 'asc' ? na - nb : nb - na;
    });

    const leases = sortLeases(allLeases);
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

    const Th = (field: string, label: string, thStyle?: React.CSSProperties) => {
        const isActive = sort === field;
        const nextDir = isActive && dir === 'asc' ? 'desc' : 'asc';
        const p = new URLSearchParams();
        p.set('view', 'list');
        p.set('sort', field);
        p.set('dir', nextDir);
        return (
            <th style={thStyle}>
                <a href={`?${p.toString()}`} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                    {label} <span style={{ fontSize: '0.65rem', opacity: isActive ? 1 : 0.3 }}>{isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                </a>
            </th>
        );
    };

    const gedComplete = (lease: typeof leases[0]) => {
        const types = lease.documents.map(d => d.docType);
        return types.includes('BAIL') && types.includes('EDL');
    };

    const actionButtons = (lease: typeof leases[0]) => {
        const complete = gedComplete(lease);
        return (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Link
                href={`/leases/${lease.id}`}
                className="std-add-button"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', ...(complete ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' } : {}) }}
                title={complete ? 'GED complète (bail + EDL)' : 'Documents du bail'}
            >
                📎{complete ? ' ✓' : ''}
            </Link>
            <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                ✏️
            </Link>
            <TerminateLeaseButton
                leaseId={lease.id}
                currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                className="std-add-button"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                label={lease.endDate ? "Modifier fin" : "🚪"}
            />
            <DeleteLeaseButton id={lease.id} className="std-add-button" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} />
        </div>
        );
    };

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
                                            {Th('apartment', 'Bien')}
                                            {Th('tenant', 'Locataire')}
                                            {Th('start', 'Début')}
                                            {Th('end', 'Fin')}
                                            <th>Loyer HC</th>
                                            <th>Charges</th>
                                            {Th('deposit', 'Caution')}
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {futureLeases.map((lease) => (
                                            <tr key={lease.id}>
                                                <td style={{ fontWeight: 600 }}>
                                                    <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'var(--primary-color)' }}>
                                                        {lease.apartment.name || lease.apartment.address}
                                                    </Link>
                                                </td>
                                                <td>
                                                    <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                                                        {lease.tenant.firstName} {lease.tenant.lastName}
                                                    </Link>
                                                </td>
                                                <td style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{formatDate(lease.startDate)}</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{lease.endDate ? formatDate(lease.endDate) : '—'}</td>
                                                <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</td>
                                                <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</td>
                                                <td>
                                                    {lease.depositAmount ? (
                                                        <DepositStatusButton
                                                            leaseId={lease.id}
                                                            currentStatus={lease.depositStatus}
                                                            amount={lease.depositAmount}
                                                            depositPaidAmount={lease.depositPaidAmount}
                                                        />
                                                    ) : '—'}
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
                                        {Th('apartment', 'Bien')}
                                        {Th('tenant', 'Locataire')}
                                        {Th('start', 'Début')}
                                        {Th('end', 'Fin prévue')}
                                        {Th('rent', 'Loyer HC')}
                                        {Th('charges', 'Charges')}
                                        {Th('cc', 'CC', { minWidth: '90px' })}
                                        {Th('deposit', 'Caution')}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeLeases.map((lease) => (
                                        <tr key={lease.id}>
                                            <td style={{ fontWeight: 600 }}>
                                                <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'var(--primary-color)' }}>
                                                    {lease.apartment.name || lease.apartment.address}
                                                </Link>
                                            </td>
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
                                            <td style={{ fontWeight: 700, color: 'var(--primary-color)', minWidth: '90px' }}>
                                                {(lease.rentAmount + lease.chargesAmount).toFixed(2)} €
                                            </td>
                                            <td>
                                                {lease.depositAmount ? (
                                                    <DepositStatusButton
                                                        leaseId={lease.id}
                                                        currentStatus={lease.depositStatus}
                                                        amount={lease.depositAmount}
                                                        depositPaidAmount={lease.depositPaidAmount}
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
                                            {Th('apartment', 'Bien')}
                                            {Th('tenant', 'Locataire')}
                                            {Th('start', 'Début')}
                                            {Th('end', 'Fin')}
                                            {Th('rent', 'Loyer HC')}
                                            {Th('charges', 'Charges')}
                                            {Th('cc', 'CC', { minWidth: '90px' })}
                                            {Th('deposit', 'Caution')}
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastLeases.map((lease) => (
                                            <tr key={lease.id} style={{ opacity: 0.7 }}>
                                                <td style={{ fontWeight: 600 }}>
                                                    <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'var(--primary-color)' }}>
                                                        {lease.apartment.name || lease.apartment.address}
                                                    </Link>
                                                </td>
                                                <td>{lease.tenant.firstName} {lease.tenant.lastName}</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formatDate(lease.startDate)}</td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{lease.endDate ? formatDate(lease.endDate) : '—'}</td>
                                                <td>{lease.rentAmount.toFixed(2)} €</td>
                                                <td>{lease.chargesAmount.toFixed(2)} €</td>
                                                <td style={{ minWidth: '90px' }}>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td>
                                                <td>
                                                    {lease.depositAmount ? (
                                                        <DepositStatusButton
                                                            leaseId={lease.id}
                                                            currentStatus={lease.depositStatus}
                                                            amount={lease.depositAmount}
                                                            depositPaidAmount={lease.depositPaidAmount}
                                                        />
                                                    ) : '—'}
                                                </td>
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
                                        const daysRemaining = daysInMonth - start.getDate();
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
                                                <h3 className={styles.cardTitle}>
                                                    <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                        {lease.apartment.name || lease.apartment.address}
                                                    </Link>
                                                </h3>
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
                                                {lease.depositAmount && (
                                                    <DepositStatusButton
                                                        leaseId={lease.id}
                                                        currentStatus={lease.depositStatus}
                                                        amount={lease.depositAmount}
                                                        depositPaidAmount={lease.depositPaidAmount}
                                                    />
                                                )}
                                            </div>
                                            <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                                                <Link href={`/leases/${lease.id}`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', ...(gedComplete(lease) ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' } : {}) }} title={gedComplete(lease) ? 'GED complète (bail + EDL)' : 'Documents du bail'}>
                                                    📎{gedComplete(lease) ? ' ✓' : ''}
                                                </Link>
                                                <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                                                    ✏️ Modifier
                                                </Link>
                                                <TerminateLeaseButton
                                                    leaseId={lease.id}
                                                    currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                    label="Dates"
                                                    className="std-add-button"
                                                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                                                />
                                                <DeleteLeaseButton id={lease.id} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }} />
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
                                                    <TerminateLeaseButton
                                                        leaseId={lease.id}
                                                        currentEndDate={lease.endDate.toISOString().split('T')[0]}
                                                        label={`Fin le ${formatDate(lease.endDate)}`}
                                                        style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, background: 'rgba(255, 165, 0, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                                    />
                                                )}
                                            </div>
                                            <h3 className={styles.cardTitle} style={{ marginTop: '0.5rem' }}>
                                                <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                    {lease.apartment.name || lease.apartment.address}
                                                </Link>
                                            </h3>
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
                                                    depositPaidAmount={lease.depositPaidAmount}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                                            <Link href={`/leases/${lease.id}`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }} title="Documents du bail">
                                                📎
                                            </Link>
                                            <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                                                ✏️ Modifier
                                            </Link>
                                            <TerminateLeaseButton
                                                leaseId={lease.id}
                                                currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                className="std-add-button"
                                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
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
                                            <h3 className={styles.cardTitle}>
                                                <Link href={`/apartments/${lease.apartment.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                    {lease.apartment.name || lease.apartment.address}
                                                </Link>
                                            </h3>
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
                                            {lease.depositAmount && (
                                                <DepositStatusButton
                                                    leaseId={lease.id}
                                                    currentStatus={lease.depositStatus}
                                                    amount={lease.depositAmount}
                                                    depositPaidAmount={lease.depositPaidAmount}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                                            <Link href={`/leases/${lease.id}`} className="std-add-button" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', opacity: 0.7, ...(gedComplete(lease) ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' } : {}) }} title={gedComplete(lease) ? 'GED complète (bail + EDL)' : 'Documents du bail'}>
                                                📎{gedComplete(lease) ? ' ✓' : ''}
                                            </Link>
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
