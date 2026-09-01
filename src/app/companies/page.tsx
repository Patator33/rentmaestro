import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";
import { ensurePersonalCompany } from "@/actions/documents";
import PageTitleIcon from "@/components/PageTitleIcon";

export const dynamic = "force-dynamic";

async function CreatePersonalCompanyButton() {
    return (
        <form action={ensurePersonalCompany}>
            <button type="submit" style={{
                background: 'rgba(43,140,238,0.1)', border: '1px dashed var(--primary-color)',
                borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem',
                color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            }}>
                + Créer l'entité «&nbsp;Bien en nom propre&nbsp;»
            </button>
        </form>
    );
}

export default async function CompaniesPage() {
    const companies = await prisma.company.findMany({
        include: { _count: { select: { apartments: true } } },
        orderBy: [{ isPersonal: 'asc' }, { name: 'asc' }]
    });

    const hasPersonal = companies.some(c => (c as any).isPersonal);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}><PageTitleIcon />Sociétés</h1>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {!hasPersonal && <CreatePersonalCompanyButton />}
                    <Link href="/companies/new" className={styles.newButton}>
                        + Nouvelle Société
                    </Link>
                </div>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    {(company as any).logoUrl && (
                                        <img src={(company as any).logoUrl} alt=""
                                            style={{ height: '32px', maxWidth: '72px', objectFit: 'contain', borderRadius: '4px' }} />
                                    )}
                                    <Link href={`/companies/${company.id}`} className={styles.cardTitle}>
                                        {company.name}
                                    </Link>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <span className={styles.badge}>{company.type}</span>
                                    {(company as any).isPersonal && (
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(43,140,238,0.12)', color: 'var(--primary-color)', borderRadius: '10px', padding: '0.15rem 0.5rem' }}>
                                            nom propre
                                        </span>
                                    )}
                                </div>
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
                                {!(company as any).isPersonal && (
                                    <Link href={`/companies/${company.id}/edit`} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>
                                        ✏️ Modifier
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
