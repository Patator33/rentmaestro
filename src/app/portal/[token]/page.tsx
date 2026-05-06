import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';

export const dynamic = 'force-dynamic';

export default async function TenantPortalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const [tenant, globalDocuments] = await Promise.all([
        prisma.tenant.findUnique({
            where: { portalToken: token },
            include: {
                tasks: { orderBy: { createdAt: 'desc' } },
                documents: { orderBy: { createdAt: 'desc' } },
                leases: {
                    include: {
                        apartment: {
                            include: {
                                company: { include: { documents: { orderBy: { createdAt: 'asc' } } } },
                                documents: { orderBy: { createdAt: 'asc' } },
                            },
                        },
                        payments: { orderBy: { period: 'desc' } },
                        documents: { orderBy: { createdAt: 'asc' } },
                    },
                    orderBy: { startDate: 'desc' },
                },
                messages: { orderBy: { createdAt: 'asc' } },
            },
        }),
        prisma.globalDocument.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    if (!tenant) {
        notFound();
    }

    const currentLease = tenant.leases[0] ?? null;

    const allPayments = tenant.leases
        .flatMap(lease => lease.payments.map(p => ({ ...p, leaseId: lease.id })))
        .sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());

    const portalDocuments = {
        leaseDocs: currentLease ? (currentLease as any).documents.map((d: any) => ({ name: d.name, url: d.url, docType: d.docType })) : [],
        tenantDocs: tenant.documents.map(d => ({ name: d.name, url: d.url, docType: '' })),
        apartmentDocs: currentLease ? (currentLease.apartment as any).documents.map((d: any) => ({ name: d.name, url: d.url, docType: d.docType ?? 'AUTRE' })) : [],
        companyDocs: currentLease ? ((currentLease.apartment as any).company?.documents ?? []).map((d: any) => ({ name: d.name, url: d.url, docType: d.docType })) : [],
        globalDocs: globalDocuments.map(d => ({ name: d.name, url: d.url, docType: d.docType })),
    };

    return (
        <PortalShell
            tenantId={tenant.id}
            firstName={tenant.firstName}
            lastName={tenant.lastName}
            token={token}
            currentLease={currentLease}
            allPayments={allPayments}
            initialTasks={tenant.tasks}
            initialMessages={tenant.messages}
            portalDocuments={portalDocuments}
        />
    );
}
