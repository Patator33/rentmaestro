import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import styles from "./page.module.css";
import DeleteApartmentButton from "@/components/DeleteApartmentButton";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";

export const dynamic = "force-dynamic";

interface SearchParams {
    q?: string;
    filter?: string;
    company?: string;
    view?: string;
    sort?: string;
    dir?: string;
}

export default async function ApartmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const query = params.q?.toLowerCase() || '';
    const filter = params.filter || '';
    const companyFilter = params.company || '';
    const view = params.view === 'list' ? 'list' : 'grid';
    const sort = params.sort || 'name';
    const dir = params.dir === 'desc' ? 'desc' : 'asc';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allApartments, companies] = await Promise.all([
        prisma.apartment.findMany({
            include: {
                leases: {
                    orderBy: { endDate: 'desc' },
                    include: { tenant: true }
                },
                company: true,
            },
            orderBy: { address: 'asc' }
        }),
        prisma.company.findMany({ orderBy: { name: 'asc' } }),
    ]);

    // Returns the lease that is actually ongoing today (not future)
    const getCurrentLease = (apt: typeof allApartments[0]) => apt.leases.find(l => {
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : null;
        return start <= today && (!end || end >= today);
    });

    // Returns a future lease (not yet started)
    const getFutureLease = (apt: typeof allApartments[0]) => apt.leases.find(l => {
        return new Date(l.startDate) > today;
    });

    let apartments = allApartments;

    if (query) {
        apartments = apartments.filter(apt =>
            apt.address.toLowerCase().includes(query) ||
            apt.city.toLowerCase().includes(query) ||
            (apt.name && apt.name.toLowerCase().includes(query)) ||
            apt.zipCode.includes(query)
        );
    }

    if (filter === 'occupied') {
        apartments = apartments.filter(apt => apt.leases.some(l => l.isActive));
    } else if (filter === 'vacant') {
        apartments = apartments.filter(apt => !apt.leases.some(l => l.isActive) && !(apt as any).soldAt);
    } else if (filter === 'soon') {
        apartments = apartments.filter(apt => (apt as any).availableFrom && new Date((apt as any).availableFrom) > today && !(apt as any).soldAt);
    } else if (filter === 'sold') {
        apartments = apartments.filter(apt => !!(apt as any).soldAt);
    }

    if (companyFilter === 'none') {
        apartments = apartments.filter(apt => !apt.companyId);
    } else if (companyFilter) {
        apartments = apartments.filter(apt => apt.companyId === companyFilter);
    }

    apartments = [...apartments].sort((a, b) => {
        const al = getCurrentLease(a), bl = getCurrentLease(b);
        let av: string | number = '', bv: string | number = '';
        switch (sort) {
            case 'city': av = a.city; bv = b.city; break;
            case 'rent': av = a.rent; bv = b.rent; break;
            case 'charges': av = a.charges; bv = b.charges; break;
            case 'cc':
                av = al ? al.rentAmount + al.chargesAmount : -1;
                bv = bl ? bl.rentAmount + bl.chargesAmount : -1;
                break;
            case 'tenant':
                av = al ? `${al.tenant.lastName} ${al.tenant.firstName}`.toLowerCase() : 'zzz';
                bv = bl ? `${bl.tenant.lastName} ${bl.tenant.firstName}`.toLowerCase() : 'zzz';
                break;
            case 'since':
                av = al ? new Date(al.startDate).getTime() : 0;
                bv = bl ? new Date(bl.startDate).getTime() : 0;
                break;
            case 'status':
                av = al ? 0 : getFutureLease(a) ? 1 : 2;
                bv = bl ? 0 : getFutureLease(b) ? 1 : 2;
                break;
            default:
                av = (a.name || a.address).toLowerCase();
                bv = (b.name || b.address).toLowerCase();
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
        if (filter) p.set('filter', filter);
        if (companyFilter) p.set('company', companyFilter);
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
                <h1 className={styles.title}>Mes Appartements</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <ViewToggle currentView={view} />
                    <Link href="/apartments/new" className="std-add-button">
                        + Ajouter un bien
                    </Link>
                </div>
            </header>

            <SearchBar
                placeholder="Rechercher un bien (adresse, ville, code postal)..."
                filterOptions={[
                    { value: '', label: '🏠 Tous statuts' },
                    { value: 'occupied', label: '🟢 Occupés' },
                    { value: 'vacant', label: '🔴 Vacants' },
                    { value: 'soon', label: '🕐 Bientôt en location' },
                    { value: 'sold', label: '📦 Vendus' },
                ]}
                filterParamName="filter"
                filterOptions2={[
                    { value: '', label: '🏢 Toutes sociétés' },
                    { value: 'none', label: '👤 Nom propre' },
                    ...companies.map((c: typeof companies[0]) => ({ value: c.id, label: c.name })),
                ]}
                filterParamName2="company"
                resultCount={query || filter || companyFilter ? apartments.length : undefined}
            />

            {(() => {
                // Split into 3 sections only when no filter active
                const noFilter = !filter && !query && !companyFilter;
                const soldApts = noFilter ? apartments.filter(apt => !!(apt as any).soldAt) : [];
                const soonApts = noFilter ? apartments.filter(apt => !(apt as any).soldAt && (apt as any).availableFrom && new Date((apt as any).availableFrom) > today) : [];
                const activeApts = noFilter ? apartments.filter(apt => !(apt as any).soldAt && !((apt as any).availableFrom && new Date((apt as any).availableFrom) > today)) : apartments;

                const renderSection = (apts: typeof apartments, sectionView: string) => {
                    if (apts.length === 0) return null;
                    return sectionView === 'list' ? (
                        <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                            <table className="std-table">
                                <thead>
                                    <tr>
                                        {Th('name', 'Bien')}
                                        {Th('city', 'Ville')}
                                        {Th('rent', 'Loyer HC')}
                                        {Th('charges', 'Charges')}
                                        {Th('cc', 'CC')}
                                        {Th('tenant', 'Locataire')}
                                        {Th('since', 'Bail depuis')}
                                        {Th('status', 'Statut')}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apts.map((apt) => {
                                        const currentLease = getCurrentLease(apt);
                                        const futureLease = getFutureLease(apt);
                                        const isOccupied = !!currentLease;
                                        return (
                                            <tr key={apt.id}>
                                                <td>
                                                    <Link href={`/apartments/${apt.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                                        {apt.name || apt.address}
                                                    </Link>
                                                    {apt.name && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{apt.address}</div>
                                                    )}
                                                </td>
                                                <td>{apt.city} {apt.zipCode}</td>
                                                <td>{apt.rent.toFixed(2)} €</td>
                                                <td>{apt.charges.toFixed(2)} €</td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {isOccupied ? `${(currentLease.rentAmount + currentLease.chargesAmount).toFixed(2)} €` : '—'}
                                                </td>
                                                <td>
                                                    {currentLease ? (
                                                        <Link href={`/tenants/${currentLease.tenant.id}`} style={{ color: 'var(--text-main)' }}>
                                                            {currentLease.tenant.firstName} {currentLease.tenant.lastName}
                                                        </Link>
                                                    ) : futureLease ? (
                                                        <span style={{ color: 'var(--accent-color)', fontSize: '0.85rem' }}>
                                                            À venir · {futureLease.tenant.firstName} {futureLease.tenant.lastName}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {currentLease ? formatDate(currentLease.startDate) : '—'}
                                                </td>
                                                <td>
                                                    {isOccupied ? (
                                                        <span style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>Occupé</span>
                                                    ) : futureLease ? (
                                                        <span style={{ background: 'rgba(255,165,0,0.12)', color: 'var(--accent-color)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>À venir</span>
                                                    ) : (
                                                        <span style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>Vacant</span>
                                                    )}
                                                </td>
                                                <td><DeleteApartmentButton id={apt.id} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.grid} style={{ marginBottom: '1.5rem' }}>
                            {apts.map((apt) => {
                                const currentLease = getCurrentLease(apt);
                                const futureLease = getFutureLease(apt);
                                const activeLease = apt.leases.find(l => l.isActive);
                                const lastLease = apt.leases[0];
                                const isVacant = !activeLease;
                                return (
                                    <div key={apt.id} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <h2 className={styles.cardTitle}>
                                                <Link href={`/apartments/${apt.id}`} className={styles.cardLink} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                                            {isVacant ? (
                                                <div className={styles.vacantBadge}>
                                                    🔓 Vacant
                                                    {lastLease?.endDate && (
                                                        <span style={{ fontSize: '0.8em', opacity: 0.8, fontWeight: 400 }}>
                                                            depuis le {formatDate(lastLease.endDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : currentLease ? (
                                                <div className={styles.tenantBadge}>
                                                    👤
                                                    <Link href={`/tenants/${currentLease.tenant.id}`}>
                                                        {currentLease.tenant.firstName} {currentLease.tenant.lastName}
                                                    </Link>
                                                    <span style={{ fontSize: '0.8em', opacity: 0.8, fontWeight: 400, marginLeft: 'auto' }}>
                                                        Du {formatDate(currentLease.startDate)}
                                                        {currentLease.endDate ? ` au ${formatDate(currentLease.endDate)}` : ' (En cours)'}
                                                    </span>
                                                </div>
                                            ) : futureLease ? (
                                                <div className={styles.vacantBadge} style={{ borderColor: 'rgba(255,165,0,0.3)', color: 'var(--accent-color)', background: 'rgba(255,165,0,0.08)' }}>
                                                    🕐 À venir · {futureLease.tenant.firstName} {futureLease.tenant.lastName}
                                                    <span style={{ fontSize: '0.8em', opacity: 0.8, fontWeight: 400, marginLeft: 'auto' }}>
                                                        dès le {formatDate(futureLease.startDate)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className={styles.vacantBadge}>🔓 Vacant</div>
                                            )}
                                        </div>
                                        <div className={styles.cardFooter}>
                                            <DeleteApartmentButton id={apt.id} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                };

                return (
                    <>
                        {apartments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                <p>{query || filter ? 'Aucun appartement trouvé pour ces critères.' : 'Aucun appartement enregistré. Commencez par en ajouter un.'}</p>
                            </div>
                        ) : noFilter ? (
                            <>
                                {soonApts.length > 0 && (
                                    <section style={{ marginBottom: '2rem' }}>
                                        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            🕐 Bientôt en location — {soonApts.length} bien{soonApts.length > 1 ? 's' : ''}
                                        </h2>
                                        {renderSection(soonApts, view)}
                                    </section>
                                )}
                                <section style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        🏠 Biens actifs — {activeApts.length} bien{activeApts.length > 1 ? 's' : ''}
                                    </h2>
                                    {activeApts.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun bien actif.</p>
                                    ) : renderSection(activeApts, view)}
                                </section>
                                {soldApts.length > 0 && (
                                    <details style={{ marginBottom: '2rem' }}>
                                        <summary style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            📦 Vendus — {soldApts.length} bien{soldApts.length > 1 ? 's' : ''}
                                        </summary>
                                        <div style={{ marginTop: '0.75rem' }}>
                                            {renderSection(soldApts, view)}
                                        </div>
                                    </details>
                                )}
                            </>
                        ) : renderSection(apartments, view)}
                    </>
                );
            })()}
        </div>
    );
}
