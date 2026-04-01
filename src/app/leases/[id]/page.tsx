import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import LeaseDocumentUpload from "@/components/LeaseDocumentUpload";
import { markDepositReceived, markDepositReturned } from "@/actions/leases";

export const dynamic = "force-dynamic";

const DEPOSIT_LABELS: Record<string, string> = {
    PENDING:   'En attente',
    RECEIVED:  'Perçue',
    TO_RETURN: 'À rendre',
    RETURNED:  'Rendue',
    DEDUCTED:  'Déduite',
};

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const lease = await prisma.lease.findUnique({
        where: { id },
        include: {
            apartment: true,
            tenant: true,
            documents: { orderBy: { createdAt: 'desc' } },
        }
    });

    if (!lease) notFound();

    const depositStatus = lease.depositStatus || (lease.depositAmount ? 'PENDING' : null);
    const canMarkReceived = depositStatus !== 'RECEIVED' && depositStatus !== 'TO_RETURN' && depositStatus !== 'RETURNED' && depositStatus !== 'DEDUCTED';
    const canMarkReturned = depositStatus === 'RECEIVED' || depositStatus === 'TO_RETURN' || depositStatus === 'PENDING' || depositStatus === null;

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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <Link href="/leases" style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}>← Retour aux baux</Link>

            <h1 style={{ marginTop: '1rem', marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: 700 }}>
                {lease.apartment.name || lease.apartment.address}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                {lease.tenant.firstName} {lease.tenant.lastName} · Du {formatDate(lease.startDate)}{lease.endDate ? ` au ${formatDate(lease.endDate)}` : ' (en cours)'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loyer CC</span><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{(lease.rentAmount + lease.chargesAmount).toFixed(2)} €</div></div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Caution</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{lease.depositAmount ? `${lease.depositAmount.toFixed(2)} €` : '—'}</div>
                    {depositStatus && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{DEPOSIT_LABELS[depositStatus] ?? depositStatus}</div>}
                    {lease.depositReturnedAt && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restituée le {formatDate(lease.depositReturnedAt)}</div>}
                </div>
            </div>

            {/* Deposit actions */}
            {canMarkReceived && (
                <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>💰 Marquer la caution comme perçue</h2>
                    <form action={markReceivedAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Montant perçu (€)</label>
                            <input type="number" name="amount" step="0.01" defaultValue={lease.depositAmount ?? ''} required
                                style={{ background: 'var(--bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-main)', width: '140px' }} />
                        </div>
                        <button type="submit" style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                            ✓ Caution perçue
                        </button>
                    </form>
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

            <section>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>📎 Documents du bail</h2>
                <LeaseDocumentUpload leaseId={lease.id} initialDocuments={lease.documents} />
            </section>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <Link href={`/leases/${lease.id}/edit`} className="std-add-button" style={{ fontSize: '0.9rem' }}>✏️ Modifier le bail</Link>
            </div>
        </div>
    );
}
