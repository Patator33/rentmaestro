import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import TerminateLeaseButton from "@/components/TerminateLeaseButton";
import { formatDate } from "@/lib/utils";
import ExpenseForm from "@/components/ExpenseForm";
import TaskBoard from "@/components/TaskBoard";
import InspectionBoard from "@/components/InspectionBoard";
import ApartmentDocumentUpload from "@/components/ApartmentDocumentUpload";
import { ALL_COST_FIELDS, isFieldInherited, inheritedFieldValue, apartmentEffectiveCosts } from "@/lib/building-expenses";
import PageTitleIcon from "@/components/PageTitleIcon";

export const dynamic = "force-dynamic";

export default async function ApartmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const apartment = await prisma.apartment.findUnique({
        where: { id },
        include: {
            company: true,
            building: {
                include: { apartments: { select: { id: true } } }
            },
            leases: {
                include: {
                    tenant: true,
                    payments: true,
                    inspections: {
                        orderBy: { date: 'desc' }
                    }
                },
                orderBy: { startDate: 'desc' }
            },
            documents: {
                orderBy: { createdAt: 'desc' }
            },
            expenses: {
                orderBy: { date: 'desc' }
            },
            tasks: {
                include: {
                    notes: { orderBy: { createdAt: 'asc' } },
                    documents: { orderBy: { createdAt: 'desc' } },
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!apartment) {
        notFound();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Chaque poste (crédit, assurance, taxe, charges communes) est mixte :
    // hérité de l'immeuble (quote-part) s'il le renseigne, sinon la valeur
    // propre de l'appartement — non modifiable ici quand hérité.
    const costRows = ALL_COST_FIELDS.map(f => ({
        key: f.key,
        label: f.label,
        value: inheritedFieldValue(f.key, apartment, apartment.building),
        inherited: isFieldInherited(f.key, apartment.building),
    })).filter(r => r.value > 0);
    const totalCosts = apartmentEffectiveCosts(apartment, apartment.building);

    return (
        <div className={styles.container}>
            <Link href="/apartments" className={styles.backLink}>
                ← Retour à la liste
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}><PageTitleIcon />{apartment.name || apartment.address}</h1>
                    <p className={styles.subtitle}>
                        {apartment.zipCode} {apartment.city}
                        {apartment.company && (
                            <span style={{ marginLeft: '1rem' }}>
                                | Propriétaire: <Link href={`/companies/${apartment.company.id}`} className="hover:text-primary hover:underline">{apartment.company.name}</Link>
                            </span>
                        )}
                    </p>
                </div>
                <Link href={`/apartments/${apartment.id}/edit`} className={styles.editButton}>
                    ✏️ Modifier
                </Link>
            </header>

            <section className={styles.detailsGrid}>
                {(apartment as any).surface && (
                    <div className={styles.detailItem}>
                        <span className={styles.label}>Surface</span>
                        <span className={styles.value}>{(apartment as any).surface} m²</span>
                    </div>
                )}
                {(apartment as any).dpe && (
                    <div className={styles.detailItem}>
                        <span className={styles.label}>DPE</span>
                        <span className={styles.value} style={{
                            fontWeight: 700,
                            color: ({ A:'#22c55e', B:'#84cc16', C:'#a3e635', D:'#facc15', E:'#fb923c', F:'#f87171', G:'#ef4444' } as Record<string,string>)[(apartment as any).dpe] ?? 'inherit'
                        }}>
                            {(apartment as any).dpe}
                        </span>
                    </div>
                )}
                <div className={styles.detailItem}>
                    <span className={styles.label}>Loyer</span>
                    <span className={styles.value}>{apartment.rent.toFixed(2)} €</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.label}>Charges</span>
                    <span className={styles.value}>{apartment.charges.toFixed(2)} €</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.label}>Loyer brut</span>
                    <span className={styles.value}>{(apartment.rent + apartment.charges).toFixed(2)} €</span>
                </div>
                {costRows.map(r => (
                    <div className={styles.detailItem} key={r.key}>
                        <span className={styles.label}>{r.label}{r.inherited ? ' (hérité immeuble)' : ''}</span>
                        <span className={styles.value} style={{ color: 'var(--error)' }} title={r.inherited ? "Renseigné sur la fiche immeuble, non modifiable ici" : undefined}>
                            -{r.value.toFixed(2)} €
                        </span>
                    </div>
                ))}
                {costRows.length > 0 ? (
                    <div className={styles.detailItem}>
                        <span className={styles.label}>Cash Flow Net Net</span>
                        <span className={styles.value} style={{ color: (apartment.rent + apartment.charges - totalCosts) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                            {(apartment.rent + apartment.charges - totalCosts).toFixed(2)} €
                        </span>
                    </div>
                ) : null}
                {apartment.complement && (
                    <div className={styles.detailItem}>
                        <span className={styles.label}>Complément</span>
                        <span className={styles.value}>{apartment.complement}</span>
                    </div>
                )}
                {apartment.comment && (
                    <div className={styles.detailItem} style={{ gridColumn: '1 / -1', marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <span className={styles.label} style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-color)' }}>Commentaire interne (Privé)</span>
                        <span className={styles.value} style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{apartment.comment}</span>
                    </div>
                )}
            </section>

            <h2 className={styles.sectionTitle}>Historique des Locataires</h2>

            <div className="table-container">
                <table className="std-table">
                    <thead>
                        <tr>
                            <th>Locataire</th>
                            <th>Début du bail</th>
                            <th>Fin du bail</th>
                            <th>Loyer (CC)</th>
                            <th>Perçu</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apartment.leases.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Aucun locataire enregistré pour cet appartement.
                                </td>
                            </tr>
                        ) : (
                            apartment.leases.map(lease => {
                                const start = new Date(lease.startDate);
                                let status: 'FUTURE' | 'ACTIVE' | 'PAST' = 'PAST';

                                // isActive fait foi (même source que les pages Immeubles/Biens) :
                                // un bail terminé ne doit jamais réapparaître "en cours" ici même
                                // sans date de fin renseignée.
                                if (lease.isActive) {
                                    status = start > today ? 'FUTURE' : 'ACTIVE';
                                }

                                return (
                                    <tr key={lease.id}>
                                        <td style={{ fontWeight: 500 }}>
                                            <Link href={`/tenants/${lease.tenant.id}`} className="hover:underline hover:text-primary">
                                                {lease.tenant.firstName} {lease.tenant.lastName}
                                            </Link>
                                        </td>
                                        <td>{formatDate(lease.startDate)}</td>
                                        <td>{lease.endDate ? formatDate(lease.endDate) : '-'}</td>
                                        <td>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</td>
                                        <td style={{ color: '#15803d', fontWeight: 600 }}>
                                            {lease.payments
                                                .filter((p) => p.status === 'PAID')
                                                .reduce((acc, curr) => acc + curr.amount, 0)
                                                .toFixed(2)} €
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {status === 'FUTURE' && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-color)', background: 'rgba(255, 165, 0, 0.15)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>À VENIR</span>
                                                )}
                                                {status === 'ACTIVE' && (
                                                    <span className={styles.activeStatus} style={{ color: 'var(--success)' }}>EN COURS</span>
                                                )}
                                                {status === 'PAST' && (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>TERMINÉ</span>
                                                )}

                                                {(status !== 'PAST' || !lease.endDate) && (
                                                    <TerminateLeaseButton
                                                        leaseId={lease.id}
                                                        currentEndDate={lease.endDate ? lease.endDate.toISOString().split('T')[0] : undefined}
                                                        isActive={lease.isActive}
                                                        label={lease.endDate ? "Modifier" : "Terminer"}
                                                        className={lease.endDate ? styles.tableEditButton : undefined}
                                                        style={lease.endDate ? {} : undefined}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2 className={styles.sectionTitle}>Documents (GED)</h2>
                <ApartmentDocumentUpload
                    apartmentId={apartment.id}
                    initialDocuments={apartment.documents}
                />
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1rem' }}>
                    Interventions & Tâches
                </h2>
                <TaskBoard key={apartment.id} apartmentId={apartment.id} apartmentAddress={`${apartment.address}, ${apartment.city}`} initialTasks={apartment.tasks as any} />
            </div>

            <div style={{ marginTop: '2rem' }}>
                <InspectionBoard
                    apartmentId={apartment.id}
                    leases={apartment.leases.map((l: typeof apartment.leases[0]) => ({
                        id: l.id,
                        tenantFirstName: l.tenant.firstName,
                        tenantLastName: l.tenant.lastName,
                        startDate: l.startDate,
                        inspections: l.inspections,
                    }))}
                />
            </div>

            <ExpenseForm apartmentId={apartment.id} expenses={apartment.expenses} />
        </div>
    );
}
