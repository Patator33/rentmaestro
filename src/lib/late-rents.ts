import { prisma } from '@/lib/prisma';
import {
    expectedRentForPeriod,
    isRentSettled,
    isRentLate,
    unsettledPastRents,
    PAST_MONTHS_SCANNED,
} from '@/lib/rent-period';

export interface LateRent {
    tenantName: string;
    address: string;
    period: Date;
}

/**
 * Loyers en retard calculés à la volée, comme le dashboard et la page Loyers :
 * le statut LATE stocké n'est posé que par /api/cron/daily, qui n'est pas
 * forcément planifié — s'y fier laissait la notification quotidienne muette.
 */
export async function getLateRents(now: Date = new Date()): Promise<LateRent[]> {
    const currentPeriod = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const scanFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth() - PAST_MONTHS_SCANNED, 1));

    const leases = await prisma.lease.findMany({
        where: {
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: scanFrom } }],
        },
        include: {
            tenant: true,
            apartment: true,
            payments: { where: { period: { gte: scanFrom } } },
        },
    });

    const label = (l: (typeof leases)[number]) => ({
        tenantName: `${l.tenant.firstName} ${l.tenant.lastName}`,
        address: l.apartment.name || l.apartment.address,
    });

    const late: LateRent[] = [];

    for (const lease of leases) {
        if (lease.endDate && new Date(lease.endDate) < currentPeriod) continue;
        const payment = lease.payments.find(p => p.period.getTime() === currentPeriod.getTime()) ?? null;
        if (isRentSettled(payment, expectedRentForPeriod(lease, currentPeriod))) continue;
        if (isRentLate(currentPeriod, lease.tenant.paymentDay, lease.startDate, now)) {
            late.push({ ...label(lease), period: currentPeriod });
        }
    }

    for (const past of unsettledPastRents(leases, currentPeriod)) {
        late.push({ ...label(past.lease), period: past.period });
    }

    return late;
}
