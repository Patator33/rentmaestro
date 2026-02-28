import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const company = await prisma.company.findUnique({
        where: { id },
        include: {
            apartments: {
                orderBy: { name: 'asc' }
            }
        }
    });

    if (!company) {
        notFound();
    }

    return (
        <div className={styles.container}>
            <Link href="/companies" className={styles.backLink}>
                ← Retour aux sociétés
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        {company.name}
                        <span className={styles.badge} style={{ marginLeft: '1rem' }}>{company.type}</span>
                    </h1>
                    <p className={styles.subtitle}>Créée le {formatDate(company.createdAt)}</p>
                </div>
                <Link href={`/companies/${company.id}/edit`} className={styles.editButton}>
                    ✏️ Modifier
                </Link>
            </header>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Informations légales</h2>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>SIRET</span>
                        <span className={styles.value}>{company.siret || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Adresse du siège</span>
                        <span className={styles.value}>{company.address || '-'}</span>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Biens immobiliers ({company.apartments.length})
                </h2>

                {company.apartments.length === 0 ? (
                    <div className={styles.emptyApt}>
                        <p>Aucun bien n'est actuellement rattaché à cette société.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Vous pouvez associer un bien depuis sa fiche ou lors de sa création.
                        </p>
                    </div>
                ) : (
                    <div className={styles.apartmentsGrid}>
                        {company.apartments.map(apt => (
                            <Link key={apt.id} href={`/apartments/${apt.id}`} className={styles.apartmentCard}>
                                <div>
                                    <h3 className={styles.aptName}>{apt.name || apt.address}</h3>
                                    <p className={styles.aptAddress}>{apt.city} ({apt.zipCode})</p>
                                </div>
                                <div className={styles.aptFinance}>
                                    <span>Loyer CC:</span>
                                    <span className={styles.aptRent}>{(apt.rent + apt.charges).toFixed(2)} €</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
