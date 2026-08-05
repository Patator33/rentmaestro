import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import styles from "./page.module.css";
import DeleteApartmentButton from "@/components/DeleteApartmentButton";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";
import { PAST_MONTHS_SCANNED } from "@/lib/rent-period";
import { apartmentState } from "@/lib/apartment-state";

// Palette de statut, alignée sur celle du tableau de bord.
const STATUS_COLORS = {
    ok: '#a3e635',      // vert   — loyer payé
    late: '#ef4444',    // rouge  — en retard
    pending: '#fbbf24', // jaune  — pas encore payé
    vacant: '#fb923c',  // orange — logement vacant
    soon: '#67e8f9',    // cyan   — bail à venir
} as const;

const MONTHS_ABBR = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUI', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

// « MAR 26 » : période courte, comme sur la maquette.
function shortPeriod(d: Date | string): string {
    const date = new Date(d);
    return `${MONTHS_ABBR[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
}

export const dynamic = "force-dynamic";

interface SearchParams {
    q?: string;
    filter?: string;
    company?: string;
    building?: string;
    view?: string;
    sort?: string;
    dir?: string;
}

export default async function ApartmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const query = params.q?.toLowerCase() || '';
    const filter = params.filter || '';
    const companyFilter = params.company || '';
    const buildingFilter = params.building || '';
    const view = params.view === 'grid' ? 'grid' : 'list';
    const sort = params.sort || 'name';
    const dir = params.dir === 'desc' ? 'desc' : 'asc';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Premier jour du mois courant (UTC), comme les périodes stockées.
    const currentPeriod = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
    const scanFrom = new Date(Date.UTC(today.getFullYear(), today.getMonth() - PAST_MONTHS_SCANNED, 1));

    const [allApartments, companies, buildings] = await Promise.all([
        prisma.apartment.findMany({
            include: {
                leases: {
                    orderBy: { endDate: 'desc' },
                    include: {
                        tenant: true,
                        // Nécessaire pour le dernier versement et le retard affichés en liste.
                        payments: {
                            where: { period: { gte: scanFrom } },
                            orderBy: { period: 'desc' },
                        },
                    },
                },
                company: true,
                building: true,
            },
            orderBy: { address: 'asc' }
        }),
        prisma.company.findMany({ orderBy: { name: 'asc' } }),
        prisma.building.findMany({ orderBy: { name: 'asc' } }),
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

    // Même logique que la barre d'occupation du tableau de bord (source unique).
    const getRentState = (apt: typeof allApartments[0]) => apartmentState(apt, currentPeriod, today);

    // Dernier loyer effectivement encaissé (paiements triés du plus récent au plus ancien).
    const getLastPaidPeriod = (apt: typeof allApartments[0]): Date | null => {
        const paid = getCurrentLease(apt)?.payments.find(p => p.status === 'PAID');
        return paid ? new Date(paid.period) : null;
    };

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

    if (buildingFilter === 'none') {
        apartments = apartments.filter(apt => !(apt as any).buildingId);
    } else if (buildingFilter) {
        apartments = apartments.filter(apt => (apt as any).buildingId === buildingFilter);
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
            case 'status': {
                // Du plus urgent au plus sain : retard, attente, vacant, à venir, ok.
                const rank = { late: 0, pending: 1, vacant: 2, soon: 3, ok: 4 } as const;
                av = rank[getRentState(a).code];
                bv = rank[getRentState(b).code];
                break;
            }
            case 'lastPaid':
                av = getLastPaidPeriod(a)?.getTime() ?? 0;
                bv = getLastPaidPeriod(b)?.getTime() ?? 0;
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
        if (buildingFilter) p.set('building', buildingFilter);
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
                filterOptions3={buildings.length > 0 ? [
                    { value: '', label: '🏢 Tous immeubles' },
                    { value: 'none', label: '— Sans immeuble' },
                    ...buildings.map(b => ({ value: b.id, label: b.name })),
                ] : undefined}
                filterParamName3="building"
                resultCount={query || filter || companyFilter || buildingFilter ? apartments.length : undefined}
            />

            {(() => {
                // Split into 3 sections only when no filter active
                const noFilter = !filter && !query && !companyFilter && !buildingFilter;
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
                                        {Th('tenant', 'Locataire')}
                                        <th style={{ textAlign: 'right' }}>Loyer</th>
                                        {Th('lastPaid', 'Dernier vers.')}
                                        {Th('status', 'État')}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apts.map((apt) => {
                                        const currentLease = getCurrentLease(apt);
                                        const futureLease = getFutureLease(apt);
                                        const state = getRentState(apt);
                                        const lastPaid = getLastPaidPeriod(apt);
                                        const rentCC = currentLease
                                            ? currentLease.rentAmount + currentLease.chargesAmount
                                            : apt.rent + apt.charges;

                                        const pill = {
                                            ok: { label: 'OK', color: STATUS_COLORS.ok },
                                            pending: { label: 'ATTENTE', color: STATUS_COLORS.pending },
                                            late: { label: `J+${state.code === 'late' ? state.days : 0}`, color: STATUS_COLORS.late },
                                            vacant: { label: 'VAC', color: STATUS_COLORS.vacant },
                                            soon: { label: 'À VENIR', color: STATUS_COLORS.soon },
                                        }[state.code];

                                        return (
                                            <tr key={apt.id}>
                                                <td>
                                                    <Link href={`/apartments/${apt.id}`} style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                        {apt.name || apt.address}
                                                    </Link>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 2 }}>
                                                        {apt.city}
                                                        {apt.surface ? ` · ${apt.surface} m²` : ''}
                                                        {(apt as any).building ? ` · ${(apt as any).building.name}` : ''}
                                                    </div>
                                                </td>
                                                <td>
                                                    {currentLease ? (
                                                        <Link href={`/tenants/${currentLease.tenant.id}`} style={{ color: 'var(--primary-color)' }}>
                                                            {currentLease.tenant.firstName} {currentLease.tenant.lastName}
                                                        </Link>
                                                    ) : futureLease ? (
                                                        <span style={{ color: STATUS_COLORS.soon, fontSize: '0.85rem' }}>
                                                            À venir · {futureLease.tenant.firstName} {futureLease.tenant.lastName}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— vacant —</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {rentCC.toFixed(2)} €
                                                </td>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.06em', color: state.code === 'late' ? STATUS_COLORS.late : 'var(--text-secondary)' }}>
                                                    {lastPaid ? shortPeriod(lastPaid) : '—'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-block', minWidth: 42, textAlign: 'center',
                                                        background: `${pill.color}1f`, color: pill.color,
                                                        border: `1px solid ${pill.color}55`,
                                                        padding: '0.15rem 0.55rem', borderRadius: '9999px',
                                                        fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
                                                        letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                                    }}>
                                                        {pill.label}
                                                    </span>
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
                                            {(apt as any).building && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>🏢 {(apt as any).building.name}</p>
                                            )}
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
