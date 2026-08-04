import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { expectedRentForPeriod, isRentSettled, isRentLate } from '@/lib/rent-period';

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
            // `lt` : un bail démarrant le 1er du mois suivant ne doit rien sur ce mois.
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
        // Prorata d'entrée ET de sortie : le mois de départ d'un locataire n'est
        // pas dû en entier.
        const fallbackAmount = expectedRentForPeriod(lease, startOfMonth);
        const isLate = isRentLate(startOfMonth, lease.tenant.paymentDay, lease.startDate, now);

        // Auto-fix: PARTIAL where paidAmount covers the expected amount → mark as PAID in DB
        let effectiveStatus = payment?.status ?? null;
        if (payment?.status === 'PARTIAL' && isRentSettled(payment, fallbackAmount)) {
            effectiveStatus = 'PAID';
            prisma.rentPayment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAmount: null } }).catch(() => {});
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
