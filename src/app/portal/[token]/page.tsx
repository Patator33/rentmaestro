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
                tasks: {
                    orderBy: { createdAt: 'desc' },
                    include: { notes: { orderBy: { createdAt: 'asc' } } },
                },
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

    // Fetch apartment-level tasks (travaux without tenant) for the active lease
    const apartmentTravaux = currentLease
        ? await prisma.task.findMany({
              where: { apartmentId: currentLease.apartmentId, tenantId: null },
              include: { notes: { orderBy: { createdAt: 'asc' } } },
              orderBy: { createdAt: 'desc' },
          })
        : [];

    // Merge incidents (tenant tasks) + travaux, sorted by date desc
    const allTasks = [
        ...tenant.tasks,
        ...apartmentTravaux,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allPayments = tenant.leases
        .flatMap(lease => lease.payments.map(p => ({ ...p, leaseId: lease.id })))
        .sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());

    // /uploads est protégé par le middleware : les fichiers passent par la
    // route portail qui vérifie le token et les droits d'accès du locataire.
    const fileUrl = (url: string) =>
        url.startsWith('/uploads/') ? `/api/portal/${token}/file?u=${encodeURIComponent(url)}` : url;

    const portalDocuments = {
        leaseDocs: currentLease ? (currentLease as any).documents.map((d: any) => ({ name: d.name, url: fileUrl(d.url), docType: d.docType })) : [],
        tenantDocs: tenant.documents.map(d => ({ name: d.name, url: fileUrl(d.url), docType: '' })),
        apartmentDocs: currentLease ? (currentLease.apartment as any).documents.map((d: any) => ({ name: d.name, url: fileUrl(d.url), docType: d.docType ?? 'AUTRE' })) : [],
        companyDocs: currentLease ? ((currentLease.apartment as any).company?.documents ?? []).map((d: any) => ({ name: d.name, url: fileUrl(d.url), docType: d.docType })) : [],
        globalDocs: globalDocuments.map(d => ({ name: d.name, url: fileUrl(d.url), docType: d.docType })),
    };

    return (
        <PortalShell
            tenantId={tenant.id}
            firstName={tenant.firstName}
            lastName={tenant.lastName}
            token={token}
            currentLease={currentLease}
            allPayments={allPayments}
            initialTasks={allTasks}
            initialMessages={tenant.messages}
            portalDocuments={portalDocuments}
        />
    );
}
