import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';

export const dynamic = 'force-dynamic';

export default async function TenantPortalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const tenant = await prisma.tenant.findUnique({
        where: { portalToken: token },
        include: {
            tasks: { orderBy: { createdAt: 'desc' } },
            leases: {
                include: {
                    apartment: true,
                    payments: { orderBy: { period: 'desc' } },
                },
                orderBy: { startDate: 'desc' },
            },
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!tenant) {
        notFound();
    }

    const currentLease = tenant.leases[0] ?? null;

    const allPayments = tenant.leases
        .flatMap(lease => lease.payments.map(p => ({ ...p, leaseId: lease.id })))
        .sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());

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
        />
    );
}
