import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import LeaseDocumentUpload from "@/components/LeaseDocumentUpload";
import SendDocumentsModal from "@/components/SendDocumentsModal";
import { markDepositReceived, markDepositReturned, setDepositAmount, setGuarantorVisaleOk } from "@/actions/leases";

export const dynamic = "force-dynamic";

const DEPOSIT_LABELS: Record<string, string> = {
    PENDING:          'En attente',
    PARTIAL_RECEIVED: 'Partiellement perçue',
    RECEIVED:         'Perçue',
    TO_RETURN:        'À rendre',
    RETURNED:         'Rendue',
    DEDUCTED:         'Déduite',
};

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [lease, globalDocs] = await Promise.all([
        prisma.lease.findUnique({
            where: { id },
            include: {
                apartment: {
                    include: {
                        company: { include: { documents: { orderBy: { createdAt: 'asc' } } } },
                        documents: { orderBy: { createdAt: 'asc' } },
                    }
                },
                tenant: true,
                documents: { orderBy: { createdAt: 'desc' } },
            }
        }),
        prisma.globalDocument.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    if (!lease) notFound();

    const depositStatus = lease.depositStatus || (lease.depositAmount ? 'PENDING' : null);
    const guarantorType = (lease as any).guarantorType as string | null;
    const guarantorVisaleOk = !!((lease as any).guarantorVisaleOk);
    const hasCautionnement = lease.documents.some((d: any) => d.docType === 'CAUTIONNEMENT');
    const guarantorOk = !guarantorType || guarantorType === 'NONE' ? true
        : guarantorType === 'PRIVATE' ? hasCautionnement
        : guarantorVisaleOk; // VISALE
    const canMarkReceived = depositStatus === 'PENDING' || depositStatus === 'PARTIAL_RECEIVED';
    const canMarkReturned = depositStatus === 'RECEIVED' || depositStatus === 'TO_RETURN' || depositStatus === 'PENDING' || depositStatus === null;
    const depositPaidAmount = (lease as any).depositPaidAmount as number | null;
    const depositRemaining = (lease.depositAmount && depositPaidAmount != null)
        ? Math.max(0, lease.depositAmount - depositPaidAmount)
        : null;

    const markReceivedAction = async (formData: FormData) => {
        'use server';
        const amount = parseFloat(formData.get('amount') as string);
        if (!isNaN(amount) && amount > 0) await markDepositReceived(id, amount);
    };

    const markReturnedAction = async (formData: FormData) => {
        'use server';
        const amount = parseFloat(formData.get('amount') as string);
        if (!isNaN(amount) && amount >= 0) await markDepositReturned(id, amount);
    };

    const setDepositAmountAction = async (formData: FormData) => {
        'use server';
        const amt = parseFloat(formData.get('depositAmount') as string);
        if (!isNaN(amt) && amt > 0) await setDepositAmount(id, amt);
    };

    const toggleVisaleOkAction = async () => {
        'use server';
        await setGuarantorVisaleOk(id, !guarantorVisaleOk);
    };

    const companyDocs = lease.apartment.company?.documents.map(d => ({
        name: d.name, url: d.url, docType: d.docType,
    })) ?? [];
    const apartmentDocs = lease.apartment.documents.map(d => ({
        name: d.name, url: d.url, docType: (d as any).docType ?? 'AUTRE',
    }));
    const globalDocsForModal = globalDocs.map(d => ({
        name: d.name, url: d.url, docType: d.docType,
    }));
    const leaseDocs = lease.documents.map(d => ({
        name: d.name, url: d.url, docType: d.docType,
    }));
    const hasBailType = lease.apartment.documents.some((d: any) => d.docType === 'BAIL_TYPE');
    const hasEdl = lease.apartment.documents.some((d: any) => d.docType === 'ETAT_DES_LIEUX');

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <Link href="/leases" style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}>← Retour aux baux</Link>

            <h1 style={{ marginTop: '1rem', marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: 700 }}>
                {lease.apartment.name || lease.apartment.address}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                    {lease.tenant.firstName} {lease.tenant.lastName}
                </Link>
                {lease.tenant.coTenantFirstName && (
                    <> · <Link href={`/tenants/${lease.tenant.id}`} style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                        {lease.tenant.coTenantFirstName} {lease.tenant.coTenantLastName}
                    </Link></>
                )}
                {' · '}Du {formatDate(lease.startDate)}{lease.endDate ? ` au ${formatDate(lease.endDate)}` : ' (en cours)'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem', background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loyer CC</span><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</div></div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Caution</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{lease.depositAmount ? `${lease.depositAmount.toFixed(2)} €` : '—'}</div>
                    {depositStatus && (
                        <div style={{ fontSize: '0.8rem', color: depositStatus === 'PARTIAL_RECEIVED' ? '#f97316' : 'var(--text-secondary)' }}>
                            {DEPOSIT_LABELS[depositStatus] ?? depositStatus}
                        </div>
                    )}
                    {depositStatus === 'PARTIAL_RECEIVED' && depositPaidAmount != null && (
                        <div style={{ fontSize: '0.75rem', color: '#f97316' }}>
                            Perçu : {depositPaidAmount.toFixed(2)} € · Solde : {depositRemaining?.toFixed(2)} €
                        </div>
                    )}
                    {lease.depositReturnedAt && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restituée le {formatDate(lease.depositReturnedAt)}</div>}
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Garant</span>
                    {guarantorType ? (
                        <>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                                {guarantorType === 'VISALE' ? (
                                    <span style={{ color: 'var(--accent-color)' }}>Visale</span>
                                ) : (
                                    <span>{(lease as any).guarantorFirstName} {(lease as any).guarantorLastName}</span>
                                )}
                            </div>
                            {guarantorType === 'PRIVATE' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    {(lease as any).guarantorPhone && <div>{(lease as any).guarantorPhone}</div>}
                                    {(lease as any).guarantorEmail && <div>{(lease as any).guarantorEmail}</div>}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Aucun</div>
                    )}
                </div>
            </div>

            {/* Set deposit amount when not defined */}
            {!lease.depositAmount && (
                <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>💰 Définir le montant de la caution</h2>
                    <form action={setDepositAmountAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Montant (€)</label>
                            <input type="number" name="depositAmount" step="0.01" required min="0.01"
                                style={{ background: 'var(--bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', width: '140px' }} />
                        </div>
                        <button type="submit" style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                            Enregistrer
                        </button>
                    </form>
                </section>
            )}

            {/* Deposit actions */}
            {canMarkReceived && (
                <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        💰 {depositStatus === 'PARTIAL_RECEIVED' ? 'Enregistrer un versement supplémentaire' : 'Marquer la caution comme perçue'}
                    </h2>
                    {depositStatus === 'PARTIAL_RECEIVED' && depositPaidAmount != null && (
                        <p style={{ fontSize: '0.85rem', color: '#f97316', marginBottom: '0.75rem' }}>
                            Déjà perçu : {depositPaidAmount.toFixed(2)} € · Solde restant : {depositRemaining?.toFixed(2)} €
                        </p>
                    )}
                    <form action={markReceivedAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Total perçu à ce jour (€)</label>
                            <input type="number" name="amount" step="0.01"
                                defaultValue={lease.depositAmount ?? ''}
                                required
                                style={{ background: 'var(--bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', width: '140px' }} />
                        </div>
                        <button type="submit" style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                            ✓ Enregistrer
                        </button>
                    </form>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Si le montant est inférieur au total, la caution passe en &quot;Partiellement perçue&quot;.
                    </p>
                </section>
            )}

            {canMarkReturned && (
                <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>↩️ Restituer la caution</h2>
                    <form action={markReturnedAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Montant restitué (€)</label>
                            <input type="number" name="amount" step="0.01" defaultValue={lease.depositAmount ?? ''} required
                                style={{ background: 'var(--bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', width: '140px' }} />
                        </div>
                        <button type="submit" style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                            ↩ Restituer
                        </button>
                    </form>
                </section>
            )}

            {/* ── Alerte GED garant ─────────────────────────────────── */}
            {!guarantorOk && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171', fontSize: '0.9rem', fontWeight: 500 }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    {guarantorType === 'PRIVATE'
                        ? "Acte de cautionnement manquant — veuillez déposer le document ci-dessous."
                        : "Garantie Visale non confirmée — cochez la case ci-dessous une fois le dossier Visale validé."}
                </div>
            )}

            {/* ── Section garant Visale ──────────────────────────────── */}
            {guarantorType === 'VISALE' && (
                <section style={{ background: 'var(--surface)', border: `1px solid ${guarantorVisaleOk ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🛡️ Garantie Visale
                        {guarantorVisaleOk
                            ? <span style={{ fontSize: '0.8rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '999px', padding: '0.1rem 0.6rem', fontWeight: 500 }}>Validée</span>
                            : <span style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '0.1rem 0.6rem', fontWeight: 500 }}>En attente</span>}
                    </h2>
                    <form action={toggleVisaleOkAction}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                                type="checkbox"
                                defaultChecked={guarantorVisaleOk}
                                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                            />
                            <span>Le dossier Visale a été validé et le numéro de visa obtenu</span>
                        </label>
                        <button type="submit" style={{ marginTop: '0.75rem', background: guarantorVisaleOk ? 'rgba(239,68,68,0.1)' : 'var(--primary-color)', color: guarantorVisaleOk ? '#f87171' : '#0e0f12', border: guarantorVisaleOk ? '1px solid rgba(239,68,68,0.3)' : 'none', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.9rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                            {guarantorVisaleOk ? 'Marquer comme non validée' : '✓ Confirmer la validation Visale'}
                        </button>
                    </form>
                </section>
            )}

            <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>📎 Documents du bail</h2>
                    <SendDocumentsModal
                        leaseId={lease.id}
                        tenantEmail={lease.tenant.email}
                        coTenantEmail={lease.tenant.coTenantEmail}
                        leaseDocs={leaseDocs}
                        companyDocs={companyDocs}
                        apartmentDocs={apartmentDocs}
                        globalDocs={globalDocsForModal}
                        hasBailType={hasBailType}
                        hasEdl={hasEdl}
                    />
                </div>
                <LeaseDocumentUpload leaseId={lease.id} initialDocuments={lease.documents} guarantorType={guarantorType} />
            </section>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.9rem' }}>✏️ Modifier le bail</Link>
            </div>
        </div>
    );
}
