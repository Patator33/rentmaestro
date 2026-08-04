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
    const prevMonth = new Date(Date.UTC(year, month - 1, 1));

    // Les baux terminés le mois précédent sont chargés aussi : un départ
    // n'efface pas une dette, leur impayé doit pouvoir être reporté.
    const fetchedLeases = await prisma.lease.findMany({
        where: {
            // `lt` : un bail démarrant le 1er du mois suivant ne doit rien sur ce mois.
            startDate: { lt: endOfMonth },
            OR: [{ endDate: null }, { endDate: { gte: prevMonth } }],
        },
        include: {
            tenant: true,
            apartment: true,
            payments: { where: { period: { in: [prevMonth, startOfMonth] } } },
        },
        orderBy: [{ apartment: { address: 'asc' } }],
    });

    const sameTime = (a: Date, b: Date) => new Date(a).getTime() === b.getTime();
    const leases = fetchedLeases.filter(l => !l.endDate || new Date(l.endDate) >= startOfMonth);

    const result = leases.map(lease => {
        const payment = lease.payments.find(p => sameTime(p.period, startOfMonth)) ?? null;
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
            carriedOver: false,
            tenant: { id: lease.tenant.id, firstName: lease.tenant.firstName, lastName: lease.tenant.lastName },
            apartment: { id: lease.apartment.id, address: lease.apartment.address, name: lease.apartment.name, mortgageAmount: lease.apartment.mortgageAmount, insuranceAmount: lease.apartment.insuranceAmount, taxAmount: lease.apartment.taxAmount },
        };
    });

    // Report de l'impayé du mois précédent. Piloté par le bail et non par les
    // RentPayment existants : un loyer jamais généré est tout aussi impayé.
    // `carriedOver` permet au client de l'exclure des totaux du mois.
    const carried = fetchedLeases
        .map(lease => {
            const startedBefore = new Date(lease.startDate) < startOfMonth;
            const notEndedBefore = !lease.endDate || new Date(lease.endDate) >= prevMonth;
            if (!startedBefore || !notEndedBefore) return null;

            const expected = expectedRentForPeriod(lease, prevMonth);
            if (expected <= 0) return null;

            const payment = lease.payments.find(p => sameTime(p.period, prevMonth)) ?? null;
            if (isRentSettled(payment, expected)) return null;

            const paid = payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
            return {
                leaseId: lease.id,
                paymentId: payment?.id ?? null,
                period: prevMonth.toISOString(),
                amount: expected,
                paidAmount: paid > 0 ? paid : null,
                status: payment?.status ?? null,
                paidAt: null,
                isLate: true,
                carriedOver: true,
                tenant: { id: lease.tenant.id, firstName: lease.tenant.firstName, lastName: lease.tenant.lastName },
                apartment: { id: lease.apartment.id, address: lease.apartment.address, name: lease.apartment.name, mortgageAmount: lease.apartment.mortgageAmount, insuranceAmount: lease.apartment.insuranceAmount, taxAmount: lease.apartment.taxAmount },
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json([...carried, ...result]);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
