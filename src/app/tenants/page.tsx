import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import DeleteTenantButton from "@/components/DeleteTenantButton";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SearchParams {
    q?: string;
    view?: string;
}

export default async function TenantsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const query = params.q?.toLowerCase() || '';
    const view = params.view === 'list' ? 'list' : 'grid';

    const allTenants = await prisma.tenant.findMany({
        include: {
            leases: {
                where: { isActive: true },
                include: { apartment: true }
            }
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    const tenants = query
        ? allTenants.filter(t =>
            `${t.firstName} ${t.lastName}`.toLowerCase().includes(query) ||
            t.email.toLowerCase().includes(query) ||
            (t.phone && t.phone.includes(query))
        )
        : allTenants;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Mes Locataires</h1>
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

            {tenants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>{query ? 'Aucun locataire trouvé pour cette recherche.' : 'Aucun locataire enregistré. Commencez par en ajouter un.'}</p>
                </div>
            ) : view === 'list' ? (
                /* ── TABLE VIEW ── */
                <div className="table-container">
                    <table className="std-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Email</th>
                                <th>Téléphone</th>
                                <th>Colocataire</th>
                                <th>Appartement</th>
                                <th>Bail depuis</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map((tenant) => {
                                const activeLease = tenant.leases[0];
                                const hasCoTenant = tenant.coTenantFirstName || tenant.coTenantLastName;

                                return (
                                    <tr key={tenant.id}>
                                        <td>
                                            <Link href={`/tenants/${tenant.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                                {tenant.lastName.toUpperCase()} {tenant.firstName}
                                            </Link>
                                        </td>
                                        <td style={{ fontSize: '0.9rem' }}>{tenant.email}</td>
                                        <td style={{ fontSize: '0.9rem' }}>{tenant.phone || '—'}</td>
                                        <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            {hasCoTenant ? `${tenant.coTenantFirstName || ''} ${tenant.coTenantLastName || ''}`.trim() : '—'}
                                        </td>
                                        <td>
                                            {activeLease ? (
                                                <Link href={`/apartments/${activeLease.apartment.id}`} style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                    {activeLease.apartment.name || activeLease.apartment.address}
                                                </Link>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {activeLease ? formatDate(activeLease.startDate) : '—'}
                                        </td>
                                        <td>
                                            <DeleteTenantButton id={tenant.id} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* ── GRID VIEW ── */
                <div className={styles.grid}>
                    {tenants.map((tenant) => {
                        const activeLease = tenant.leases[0];
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
                                    {activeLease && (
                                        <div className={styles.occupiedBadge}>
                                            <Link href={`/apartments/${activeLease.apartment.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit', textDecoration: 'none' }}>
                                                🏠 {activeLease.apartment.name || activeLease.apartment.address}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardFooter}>
                                    <DeleteTenantButton id={tenant.id} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
