import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM

    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth(); // 0-indexed

    if (monthParam) {
        const [y, m] = monthParam.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) { year = y; month = m - 1; }
    }

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 1));

    const leases = await prisma.lease.findMany({
        where: {
            startDate: { lt: endOfMonth },
            OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
        },
        include: {
            tenant: true,
            apartment: true,
            payments: { where: { period: startOfMonth } },
        },
        orderBy: [{ apartment: { address: 'asc' } }],
    });

    const result = leases.map(lease => {
        const payment = lease.payments[0] ?? null;
        return {
            leaseId: lease.id,
            paymentId: payment?.id ?? null,
            period: startOfMonth.toISOString(),
            amount: payment?.amount ?? (lease.rentAmount + lease.chargesAmount),
            paidAmount: (payment as any)?.paidAmount ?? null,
            status: payment?.status ?? null,
            paidAt: payment?.paidAt ?? null,
            tenant: { id: lease.tenant.id, firstName: lease.tenant.firstName, lastName: lease.tenant.lastName },
            apartment: { id: lease.apartment.id, address: lease.apartment.address, name: lease.apartment.name },
        };
    });

    return NextResponse.json(result);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
