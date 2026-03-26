import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import LeaseDocumentUpload from "@/components/LeaseDocumentUpload";

export const dynamic = "force-dynamic";

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
                <div><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Caution</span><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{lease.depositAmount ? `${lease.depositAmount.toFixed(2)} €` : '—'}</div></div>
            </div>

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
