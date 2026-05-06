import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { calculateFutureProrata } from '@/lib/utils';

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

    const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth();

    const leases = await prisma.lease.findMany({
        where: {
            startDate: { lte: endOfMonth },
            OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
        },
        include: {
            tenant: true,
            apartment: true,
            payments: { where: { period: startOfMonth } },
        },
        orderBy: [{ apartment: { address: 'asc' } }],
    });

    const currentDay = now.getUTCDate();
    const isPastMonth = year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth());

    const result = leases.map(lease => {
        const payment = lease.payments[0] ?? null;
        const paymentDay = lease.tenant.paymentDay || 5;
        const totalAmount = lease.rentAmount + lease.chargesAmount;
        const leaseStart = new Date(lease.startDate);
        const isFirstMonth = leaseStart >= startOfMonth && leaseStart < endOfMonth;
        const notStartedYet = isFirstMonth && leaseStart > now;
        const isLate = !notStartedYet && (isPastMonth || (isCurrentMonth && currentDay > paymentDay + 4));
        const prorata = isFirstMonth ? calculateFutureProrata(totalAmount, leaseStart) : null;
        const fallbackAmount = prorata ? Math.round(prorata.amount * 100) / 100 : totalAmount;

        // Auto-fix: PARTIAL where paidAmount covers the expected amount → mark as PAID in DB
        let effectiveStatus = payment?.status ?? null;
        if (payment?.status === 'PARTIAL') {
            const paid = (payment as any).paidAmount ?? 0;
            if (paid >= fallbackAmount - 0.01) {
                effectiveStatus = 'PAID';
                prisma.rentPayment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAmount: null } }).catch(() => {});
            }
        }

        return {
            leaseId: lease.id,
            paymentId: payment?.id ?? null,
            period: startOfMonth.toISOString(),
            amount: fallbackAmount,
            paidAmount: effectiveStatus === 'PAID' ? null : ((payment as any)?.paidAmount ?? null),
            status: effectiveStatus,
            paidAt: payment?.paidAt ?? null,
            isLate,
            tenant: { id: lease.tenant.id, firstName: lease.tenant.firstName, lastName: lease.tenant.lastName },
            apartment: { id: lease.apartment.id, address: lease.apartment.address, name: lease.apartment.name, mortgageAmount: lease.apartment.mortgageAmount, insuranceAmount: lease.apartment.insuranceAmount, taxAmount: lease.apartment.taxAmount },
        };
    });

    return NextResponse.json(result);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
