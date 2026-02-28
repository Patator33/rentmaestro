import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { Company } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
    const companies = await prisma.company.findMany({
        include: {
            _count: {
                select: { apartments: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Sociétés</h1>
                <Link href="/companies/new" className={styles.newButton}>
                    + Nouvelle Société
                </Link>
            </header>

            {companies.length === 0 ? (
                <div className={styles.emptyState}>
                    <h2 className={styles.emptyTitle}>Aucune structure juridique</h2>
                    <p className={styles.emptyDesc}>
                        Vous pouvez regrouper vos biens immobiliers sous différentes entités juridiques
                        (SCI, LMNP, Nom propre) pour obtenir des bilans financiers séparés.
                    </p>
                    <Link href="/companies/new" className={styles.newButton}>
                        Ajouter ma première société
                    </Link>
                </div>
            ) : (
                <div className={styles.grid}>
                    {companies.map((company) => (
                        <div key={company.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Link href={`/companies/${company.id}`} className={styles.cardTitle}>
                                    {company.name}
                                </Link>
                                <span className={styles.badge}>{company.type}</span>
                            </div>

                            <div className={styles.cardContent}>
                                {company.siret && (
                                    <div className={styles.infoRow}>
                                        <span>📝</span> SIRET: {company.siret}
                                    </div>
                                )}
                                {company.address && (
                                    <div className={styles.infoRow}>
                                        <span>📍</span> {company.address}
                                    </div>
                                )}
                            </div>

                            <div className={styles.cardFooter}>
                                <span className={styles.propertyCount}>
                                    {company._count.apartments} bien{company._count.apartments > 1 ? 's' : ''}
                                </span>
                                <Link href={`/companies/${company.id}/edit`} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>
                                    ✏️ Modifier
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
