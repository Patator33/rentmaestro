import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import styles from "./page.module.css";
import DeleteApartmentButton from "@/components/DeleteApartmentButton";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

interface SearchParams {
    q?: string;
    filter?: string;
}

export default async function ApartmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const query = params.q?.toLowerCase() || '';
    const filter = params.filter || '';

    const allApartments = await prisma.apartment.findMany({
        include: {
            leases: {
                orderBy: { endDate: 'desc' },
                include: { tenant: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    let apartments = allApartments;

    // Text search
    if (query) {
        apartments = apartments.filter(apt =>
            apt.address.toLowerCase().includes(query) ||
            apt.city.toLowerCase().includes(query) ||
            (apt.name && apt.name.toLowerCase().includes(query)) ||
            apt.zipCode.includes(query)
        );
    }

    // Status filter
    if (filter === 'occupied') {
        apartments = apartments.filter(apt => apt.leases.some(l => l.isActive));
    } else if (filter === 'vacant') {
        apartments = apartments.filter(apt => !apt.leases.some(l => l.isActive));
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Mes Appartements</h1>
                <Link href="/apartments/new" className="std-add-button">
                    + Ajouter un bien
                </Link>
            </header>

            <SearchBar
                placeholder="Rechercher un bien (adresse, ville, code postal)..."
                filterOptions={[
                    { value: '', label: '🏢 Tous' },
                    { value: 'occupied', label: '🟢 Occupés' },
                    { value: 'vacant', label: '🔴 Vacants' },
                ]}
                filterParamName="filter"
                resultCount={query || filter ? apartments.length : undefined}
            />

            {apartments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>{query || filter ? 'Aucun appartement trouvé pour ces critères.' : 'Aucun appartement enregistré. Commencez par en ajouter un.'}</p>
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
                                                    depuis le {formatDate(lastLease.endDate)}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.tenantBadge}>
                                            👤
                                            <Link href={`/tenants/${activeLease?.tenant.id}`}>
                                                {activeLease?.tenant.firstName} {activeLease?.tenant.lastName}
                                            </Link>
                                            {activeLease && (
                                                <span style={{ fontSize: '0.8em', opacity: 0.8, fontWeight: 400, marginLeft: 'auto' }}>
                                                    Du {formatDate(activeLease.startDate)}
                                                    {activeLease.endDate ? ` au ${formatDate(activeLease.endDate)}` : ' (En cours)'}
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
