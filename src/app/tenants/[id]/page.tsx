import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { uploadDocument, deleteDocument } from "@/actions/documents";
import styles from "./page.module.css";
import { formatDate } from "@/lib/utils";
import TenantNotes from "@/components/TenantNotes";
import TenantPortalLink from "@/components/TenantPortalLink";
import { archiveTenant, reactivateTenant } from "@/actions/tenants";
import TenantMessaging from "@/components/TenantMessaging";
import SendDocumentsModal from "@/components/SendDocumentsModal";

export const dynamic = "force-dynamic";

export default async function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [tenant, globalDocs] = await Promise.all([
        prisma.tenant.findUnique({
            where: { id },
            include: {
                documents: { orderBy: { createdAt: 'desc' } },
                notes: { orderBy: { createdAt: 'desc' } },
                leases: {
                    include: {
                        apartment: {
                            include: {
                                company: { include: { documents: { orderBy: { createdAt: 'asc' } } } },
                                documents: { orderBy: { createdAt: 'asc' } },
                            }
                        },
                        documents: { orderBy: { createdAt: 'asc' } },
                    },
                    orderBy: { startDate: 'desc' }
                },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        }),
        prisma.globalDocument.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    if (!tenant) notFound();

    const hasCoTenant = tenant.coTenantFirstName || tenant.coTenantLastName;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const getLeaseStatus = (lease: typeof tenant.leases[0]) => {
        const start = new Date(lease.startDate);
        const end = lease.endDate ? new Date(lease.endDate) : null;
        if (start > today) return 'future';
        if (!end || end >= today) return 'active';
        return 'past';
    };

    const globalDocsForModal = globalDocs.map(d => ({ name: d.name, url: d.url, docType: d.docType }));

    return (
        <div className={styles.container}>
            <Link href="/tenants" className={styles.backLink}>
                ← Retour aux locataires
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{tenant.firstName} {tenant.lastName}</h1>
                    <p className={styles.subtitle}>Créé le {formatDate(tenant.createdAt)}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <a
                        href={`/api/tenants/${tenant.id}/vcard`}
                        download
                        style={{ padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none' }}
                    >
                        📇 Exporter contact
                    </a>
                    <Link href={`/tenants/${tenant.id}/edit`} className={styles.editButton}>
                        ✏️ Modifier
                    </Link>
                </div>
            </header>

            <div className={styles.grid}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Informations principales</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Email</span>
                            {tenant.email ? (
                                <a href={`mailto:${tenant.email}`} className={styles.value} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                                    {tenant.email}
                                </a>
                            ) : (
                                <span className={styles.value}>-</span>
                            )}
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Téléphone</span>
                            {tenant.phone ? (
                                <a href={`tel:${tenant.phone}`} className={styles.value} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                                    {tenant.phone}
                                </a>
                            ) : (
                                <span className={styles.value}>-</span>
                            )}
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Paiement habituel</span>
                            <span className={styles.value}>Le {tenant.paymentDay || 5} du mois</span>
                        </div>
                    </div>
                </section>

                {hasCoTenant && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Colocataire</h2>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Nom complet</span>
                                <span className={styles.value}>{tenant.coTenantFirstName} {tenant.coTenantLastName}</span>
                            </div>
                            {tenant.coTenantEmail && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Email</span>
                                    <a href={`mailto:${tenant.coTenantEmail}`} className={styles.value} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                                        {tenant.coTenantEmail}
                                    </a>
                                </div>
                            )}
                            {tenant.coTenantPhone && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Téléphone</span>
                                    <a href={`tel:${tenant.coTenantPhone}`} className={styles.value} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                                        {tenant.coTenantPhone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {tenant.leases.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Baux</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {tenant.leases.map((lease) => {
                                const status = getLeaseStatus(lease);
                                const statusConfig = status === 'active'
                                    ? { label: 'Actif', color: '#22c55e' }
                                    : status === 'future'
                                    ? { label: 'À venir', color: '#f59e0b' }
                                    : { label: 'Terminé', color: '#64748b' };
                                const leaseDocs = lease.documents.map(d => ({ name: d.name, url: d.url, docType: d.docType }));
                                const companyDocs = (lease.apartment as any).company?.documents.map((d: any) => ({ name: d.name, url: d.url, docType: d.docType })) ?? [];
                                const apartmentDocs = (lease.apartment as any).documents.map((d: any) => ({ name: d.name, url: d.url, docType: (d as any).docType ?? 'AUTRE' }));
                                const hasBailType = (lease.apartment as any).documents.some((d: any) => d.docType === 'BAIL_TYPE');
                                const hasEdl = (lease.apartment as any).documents.some((d: any) => d.docType === 'ETAT_DES_LIEUX');
                                return (
                                    <div key={lease.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1rem', background: 'var(--bg)',
                                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                                        opacity: status === 'past' ? 0.65 : 1,
                                    }}>
                                        <Link href={`/leases/${lease.id}`} style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                    🏠 {lease.apartment.name || lease.apartment.address}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusConfig.color, background: `${statusConfig.color}20`, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Du {formatDate(lease.startDate)}{lease.endDate ? ` au ${formatDate(lease.endDate)}` : ' (en cours)'}
                                            </div>
                                        </Link>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem', flexShrink: 0 }}>
                                            <span style={{ padding: '0.35rem 0.85rem', background: 'rgba(43,140,238,0.1)', border: '1px solid rgba(43,140,238,0.25)', borderRadius: '20px', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                                {lease.rentAmount.toFixed(0)} € / mois
                                            </span>
                                            {status !== 'past' && (
                                                <SendDocumentsModal
                                                    leaseId={lease.id}
                                                    tenantEmail={tenant.email}
                                                    coTenantEmail={tenant.coTenantEmail}
                                                    leaseDocs={leaseDocs}
                                                    companyDocs={companyDocs}
                                                    apartmentDocs={apartmentDocs}
                                                    globalDocs={globalDocsForModal}
                                                    hasBailType={hasBailType}
                                                    hasEdl={hasEdl}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Documents</h2>

                    <form action={uploadDocument} className={styles.uploadForm}>
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <div className={styles.fileInputWrapper}>
                            <input type="file" name="file" id="file" required className={styles.fileInput} />
                            <label htmlFor="file" className={styles.fileLabel}>Choisir un fichier</label>
                        </div>
                        <button type="submit" className={styles.uploadButton}>📤 Téléverser</button>
                    </form>

                    {tenant.documents.length === 0 ? (
                        <p className={styles.emptyState}>Aucun document</p>
                    ) : (
                        <ul className={styles.documentList}>
                            {tenant.documents.map((doc) => (
                                <li key={doc.id} className={styles.documentItem}>
                                    <div className={styles.docInfo}>
                                        <a href={encodeURI(doc.url.replace('/uploads/', '/api/documents/'))} target="_blank" rel="noopener noreferrer" className={styles.docName}>
                                            📄 {doc.name}
                                        </a>
                                        <span className={styles.docSize}>{(doc.size / 1024).toFixed(1)} Ko</span>
                                    </div>
                                    <form action={deleteDocument.bind(null, doc.id, tenant.id)}>
                                        <button type="submit" className={styles.deleteButton}>🗑️</button>
                                    </form>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <TenantNotes tenantId={tenant.id} notes={tenant.notes} />

                <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
                    <h2 className={styles.sectionTitle}>Messagerie</h2>
                    <TenantMessaging tenantId={tenant.id} initialMessages={tenant.messages} />
                </section>

                {/* Portail locataire — en bas */}
                <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
                    <TenantPortalLink tenantId={tenant.id} existingToken={tenant.portalToken} isArchived={tenant.isArchived} />
                    {tenant.isArchived ? (
                        <form action={reactivateTenant.bind(null, tenant.id)} style={{ marginTop: '0.75rem' }}>
                            <button type="submit" style={{ padding: '0.5rem 1rem', background: 'rgba(43,140,238,0.1)', color: 'var(--primary-color)', border: '1px solid rgba(43,140,238,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                                Réactiver ce locataire
                            </button>
                        </form>
                    ) : (
                        (tenant as any).leases?.every((l: any) => !l.isActive) && (tenant as any).leases?.length > 0 && (
                            <form action={archiveTenant.bind(null, tenant.id)} style={{ marginTop: '0.75rem' }}>
                                <button type="submit" style={{ padding: '0.5rem 1rem', background: 'rgba(100,116,139,0.08)', color: 'var(--text-muted)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                                    Archiver ce locataire
                                </button>
                            </form>
                        )
                    )}
                </section>
            </div>
        </div>
    );
}
