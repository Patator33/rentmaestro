import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { uploadDocument, deleteDocument } from "@/actions/documents";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
            documents: {
                orderBy: { createdAt: 'desc' }
            },
            leases: {
                include: { apartment: true },
                orderBy: { startDate: 'desc' }
            }
        }
    });

    if (!tenant) {
        notFound();
    }

    const hasCoTenant = tenant.coTenantFirstName || tenant.coTenantLastName;

    return (
        <div className={styles.container}>
            <Link href="/tenants" className={styles.backLink}>
                ← Retour aux locataires
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{tenant.firstName} {tenant.lastName}</h1>
                    <p className={styles.subtitle}>Créé le {tenant.createdAt.toLocaleDateString()}</p>
                </div>
                <Link href={`/tenants/${tenant.id}/edit`} className={styles.editButton}>
                    ✏️ Modifier
                </Link>
            </header>

            <div className={styles.grid}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Informations principales</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Email</span>
                            <span className={styles.value}>{tenant.email}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Téléphone</span>
                            <span className={styles.value}>{tenant.phone || '-'}</span>
                        </div>
                    </div>
                </section>

                {hasCoTenant && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Colocataire</h2>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Nom complet</span>
                                <span className={styles.value}>
                                    {tenant.coTenantFirstName} {tenant.coTenantLastName}
                                </span>
                            </div>
                            {tenant.coTenantEmail && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Email</span>
                                    <span className={styles.value}>{tenant.coTenantEmail}</span>
                                </div>
                            )}
                            {tenant.coTenantPhone && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Téléphone</span>
                                    <span className={styles.value}>{tenant.coTenantPhone}</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {tenant.leases.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Baux actifs</h2>
                        <div className={styles.leasesList}>
                            {tenant.leases.map((lease) => (
                                <div key={lease.id} className={styles.leaseItem}>
                                    <div className={styles.leaseInfo}>
                                        <span className={styles.leaseApartment}>
                                            🏠 {lease.apartment.name || lease.apartment.address}
                                        </span>
                                        <span className={styles.leaseDate}>
                                            Du {new Date(lease.startDate).toLocaleDateString()}
                                            {lease.endDate ? ` au ${new Date(lease.endDate).toLocaleDateString()}` : ' (en cours)'}
                                        </span>
                                    </div>
                                    <div className={styles.leaseAmount}>
                                        {lease.rentAmount.toFixed(2)} € / mois
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Documents</h2>

                    <form action={uploadDocument} className={styles.uploadForm}>
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <div className={styles.fileInputWrapper}>
                            <input
                                type="file"
                                name="file"
                                id="file"
                                required
                                className={styles.fileInput}
                            />
                            <label htmlFor="file" className={styles.fileLabel}>
                                Choisir un fichier
                            </label>
                        </div>
                        <button type="submit" className={styles.uploadButton}>
                            📤 Téléverser
                        </button>
                    </form>

                    {tenant.documents.length === 0 ? (
                        <p className={styles.emptyState}>Aucun document</p>
                    ) : (
                        <ul className={styles.documentList}>
                            {tenant.documents.map((doc) => (
                                <li key={doc.id} className={styles.documentItem}>
                                    <div className={styles.docInfo}>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.docName}>
                                            📄 {doc.name}
                                        </a>
                                        <span className={styles.docSize}>
                                            {(doc.size / 1024).toFixed(1)} Ko
                                        </span>
                                    </div>
                                    <form action={deleteDocument.bind(null, doc.id, tenant.id)}>
                                        <button type="submit" className={styles.deleteButton}>
                                            🗑️
                                        </button>
                                    </form>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
