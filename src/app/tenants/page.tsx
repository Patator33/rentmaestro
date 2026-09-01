import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import DeleteTenantButton from "@/components/DeleteTenantButton";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";
import { formatDate } from "@/lib/utils";
import { archiveTenant, reactivateTenant } from "@/actions/tenants";
import PageTitleIcon from "@/components/PageTitleIcon";

export const dynamic = "force-dynamic";

interface SearchParams {
    q?: string;
    view?: string;
    sort?: string;
    dir?: string;
}

export default async function TenantsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const query = params.q?.toLowerCase() || '';
    const view = params.view === 'grid' ? 'grid' : 'list';
    const sort = params.sort || 'name';
    const dir = params.dir === 'desc' ? 'desc' : 'asc';

    const allTenants = await prisma.tenant.findMany({
        include: {
            leases: {
                include: { apartment: true },
                orderBy: { startDate: 'desc' }
            }
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    let tenants = query
        ? allTenants.filter(t =>
            `${t.firstName} ${t.lastName}`.toLowerCase().includes(query) ||
            t.email.toLowerCase().includes(query) ||
            (t.phone && t.phone.includes(query))
        )
        : [...allTenants];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLeaseActive = (l: { startDate: Date; endDate: Date | null }) =>
        new Date(l.startDate) <= today && (!l.endDate || new Date(l.endDate) >= today);
    const isLeaseFuture = (l: { startDate: Date }) => new Date(l.startDate) > today;

    tenants = tenants.sort((a, b) => {
        const al = a.leases.find(isLeaseActive), bl = b.leases.find(isLeaseActive);
        let av: string | number = '', bv: string | number = '';
        switch (sort) {
            case 'email': av = a.email; bv = b.email; break;
            case 'phone': av = a.phone || ''; bv = b.phone || ''; break;
            case 'cotenant':
                av = a.coTenantLastName || '';
                bv = b.coTenantLastName || '';
                break;
            case 'apartment':
                av = al ? (al.apartment.name || al.apartment.address).toLowerCase() : 'zzz';
                bv = bl ? (bl.apartment.name || bl.apartment.address).toLowerCase() : 'zzz';
                break;
            case 'since':
                av = al ? new Date(al.startDate).getTime() : (a.leases[0] ? new Date(a.leases[0].startDate).getTime() : 0);
                bv = bl ? new Date(bl.startDate).getTime() : (b.leases[0] ? new Date(b.leases[0].startDate).getTime() : 0);
                break;
            default:
                av = `${a.lastName} ${a.firstName}`.toLowerCase();
                bv = `${b.lastName} ${b.firstName}`.toLowerCase();
        }
        if (typeof av === 'string' && typeof bv === 'string')
            return dir === 'asc' ? av.localeCompare(bv, 'fr') : bv.localeCompare(av, 'fr');
        return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    const Th = (field: string, label: string) => {
        const isActive = sort === field;
        const nextDir = isActive && dir === 'asc' ? 'desc' : 'asc';
        const p = new URLSearchParams();
        if (query) p.set('q', query);
        p.set('view', 'list');
        p.set('sort', field);
        p.set('dir', nextDir);
        return (
            <th>
                <a href={`?${p.toString()}`} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                    {label} <span style={{ fontSize: '0.65rem', opacity: isActive ? 1 : 0.3 }}>{isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                </a>
            </th>
        );
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}><PageTitleIcon />Mes Locataires</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <ViewToggle currentView={view} />
                    <Link href="/tenants/new" className="std-add-button">
                        + Nouveau Locataire
                    </Link>
                </div>
            </header>

            <SearchBar
                placeholder="Rechercher un locataire (nom, email, téléphone)..."
                resultCount={query ? tenants.length : undefined}
            />

            {(() => {
                const activeTenants = tenants.filter(t => !t.isArchived && t.leases.some(isLeaseActive));
                const futureTenants = tenants.filter(t => !t.isArchived && !t.leases.some(isLeaseActive) && t.leases.some(isLeaseFuture));
                const formerTenants = tenants.filter(t => !t.isArchived && !t.leases.some(isLeaseActive) && !t.leases.some(isLeaseFuture) && t.leases.length > 0);
                const archivedTenants = tenants.filter(t => t.isArchived);
                const noLeaseTenants = tenants.filter(t => !t.isArchived && t.leases.length === 0);
                // Combine no-lease + future with active for display
                const currentTenants = [...activeTenants, ...futureTenants, ...noLeaseTenants];

                const renderTenantList = (list: typeof tenants, isFormer = false, isArchived = false) => {
                    if (list.length === 0) return null;
                    const opacity = isFormer || isArchived ? 0.7 : 1;
                    if (view === 'list') {
                        return (
                            <div className="table-container" style={{ marginBottom: '1.5rem', opacity }}>
                                <table className="std-table">
                                    <thead>
                                        <tr>
                                            {Th('name', 'Nom')}
                                            {Th('email', 'Email')}
                                            {Th('phone', 'Téléphone')}
                                            {Th('cotenant', 'Colocataire')}
                                            {Th('apartment', 'Appartement')}
                                            {Th('since', 'Bail depuis')}
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((tenant) => {
                                            const activeLease = tenant.leases.find(isLeaseActive);
                                            const lastLease = tenant.leases[0];
                                            const displayLease = activeLease || lastLease;
                                            const hasCoTenant = tenant.coTenantFirstName || tenant.coTenantLastName;
                                            return (
                                                <tr key={tenant.id}>
                                                    <td>
                                                        <Link href={`/tenants/${tenant.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                                            {tenant.lastName.toUpperCase()} {tenant.firstName}
                                                        </Link>
                                                        {isArchived && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(100,116,139,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Archivé</span>}
                                                    </td>
                                                    <td style={{ fontSize: '0.9rem' }}>{tenant.email}</td>
                                                    <td style={{ fontSize: '0.9rem' }}>{tenant.phone || '—'}</td>
                                                    <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                        {hasCoTenant ? `${tenant.coTenantFirstName || ''} ${tenant.coTenantLastName || ''}`.trim() : '—'}
                                                    </td>
                                                    <td>
                                                        {displayLease ? (
                                                            <Link href={`/apartments/${displayLease.apartment.id}`} style={{ color: isFormer ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '0.9rem' }}>
                                                                {displayLease.apartment.name || displayLease.apartment.address}
                                                            </Link>
                                                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>—</span>}
                                                    </td>
                                                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                        {displayLease ? formatDate(displayLease.startDate) : '—'}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                            {(isFormer && !isArchived) && (
                                                                <form action={archiveTenant.bind(null, tenant.id)}>
                                                                    <button type="submit" style={{ fontSize: '0.75rem', background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                                                                        Archiver
                                                                    </button>
                                                                </form>
                                                            )}
                                                            {isArchived && (
                                                                <form action={reactivateTenant.bind(null, tenant.id)}>
                                                                    <button type="submit" style={{ fontSize: '0.75rem', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                                                                        Réactiver
                                                                    </button>
                                                                </form>
                                                            )}
                                                            <DeleteTenantButton id={tenant.id} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    }
                    return (
                        <div className={styles.grid} style={{ marginBottom: '1.5rem', opacity }}>
                            {list.map((tenant) => {
                                const activeLease = tenant.leases.find(isLeaseActive);
                                const lastLease = tenant.leases[0];
                                const displayLease = activeLease || lastLease;
                                const hasCoTenant = tenant.coTenantFirstName || tenant.coTenantLastName;
                                return (
                                    <div key={tenant.id} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <h2 className={styles.cardTitle}>
                                                <Link href={`/tenants/${tenant.id}`} className={styles.cardLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    {tenant.firstName} {tenant.lastName} →
                                                </Link>
                                            </h2>
                                            <p className={styles.cardSubtitle}>Ajouté le {formatDate(tenant.createdAt)}</p>
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div className={styles.infoRow}>
                                                <span className={styles.label}>Email:</span>
                                                <span className={styles.value}>{tenant.email}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.label}>Téléphone:</span>
                                                <span className={styles.value}>{tenant.phone || '-'}</span>
                                            </div>
                                            {hasCoTenant && (
                                                <div className={styles.badge}>
                                                    👥 +1 Colocataire: {tenant.coTenantFirstName} {tenant.coTenantLastName}
                                                </div>
                                            )}
                                            {displayLease && (
                                                <div className={styles.occupiedBadge}>
                                                    <Link href={`/apartments/${displayLease.apartment.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit', textDecoration: 'none' }}>
                                                        🏠 {displayLease.apartment.name || displayLease.apartment.address}
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.cardFooter}>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {(isFormer && !isArchived) && (
                                                    <form action={archiveTenant.bind(null, tenant.id)}>
                                                        <button type="submit" style={{ fontSize: '0.75rem', background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                                                            Archiver
                                                        </button>
                                                    </form>
                                                )}
                                                {isArchived && (
                                                    <form action={reactivateTenant.bind(null, tenant.id)}>
                                                        <button type="submit" style={{ fontSize: '0.75rem', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                                                            Réactiver
                                                        </button>
                                                    </form>
                                                )}
                                                <DeleteTenantButton id={tenant.id} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                };

                if (tenants.length === 0) {
                    return (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                            <p>{query ? 'Aucun locataire trouvé pour cette recherche.' : 'Aucun locataire enregistré. Commencez par en ajouter un.'}</p>
                        </div>
                    );
                }

                return (
                    <>
                        {currentTenants.length > 0 && (
                            <section style={{ marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                                    👤 Locataires actifs — {currentTenants.length}
                                </h2>
                                {renderTenantList(currentTenants)}
                            </section>
                        )}
                        {formerTenants.length > 0 && (
                            <details style={{ marginBottom: '1.5rem' }}>
                                <summary style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    🕐 Anciens locataires — {formerTenants.length}
                                </summary>
                                <div style={{ marginTop: '0.75rem' }}>
                                    {renderTenantList(formerTenants, true)}
                                </div>
                            </details>
                        )}
                        {archivedTenants.length > 0 && (
                            <details style={{ marginBottom: '1.5rem' }}>
                                <summary style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    📦 Archivés — {archivedTenants.length}
                                </summary>
                                <div style={{ marginTop: '0.75rem' }}>
                                    {renderTenantList(archivedTenants, false, true)}
                                </div>
                            </details>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
