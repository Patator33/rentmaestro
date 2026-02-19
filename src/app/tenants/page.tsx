import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { deleteTenant } from "@/actions/tenants";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
    const tenants = await prisma.tenant.findMany({
        include: {
            leases: {
                where: { isActive: true },
                include: { apartment: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Mes Locataires</h1>
                <Link href="/tenants/new" className="std-add-button">
                    + Nouveau Locataire
                </Link>
            </header>

            {tenants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <p>Aucun locataire enregistré. Commencez par en ajouter un.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {tenants.map((tenant) => {
                        const activeLease = tenant.leases[0];
                        const hasCoTenant = tenant.coTenantFirstName || tenant.coTenantLastName;

                        return (
                            <div key={tenant.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.cardTitle}>
                                        <Link href={`/tenants/${tenant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            {tenant.firstName} {tenant.lastName} →
                                        </Link>
                                    </h2>
                                    <p className={styles.cardSubtitle}>Ajouté le {tenant.createdAt.toLocaleDateString()}</p>
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
                                            <Link href={`/apartments/${activeLease.apartment.id}`} className="hover:underline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit', textDecoration: 'none' }}>
                                                🏠 {activeLease.apartment.name || activeLease.apartment.address}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardFooter}>
                                    <form action={deleteTenant.bind(null, tenant.id)}>
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
