import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { expectedRentForPeriod, isRentSettled, isRentLate } from '@/lib/rent-period';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [leasesThisMonth, paidPayments, openIncidents, openTasks, unreadMessages] = await Promise.all([
        prisma.lease.findMany({
            where: {
                startDate: { lte: now },
                OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
            },
            include: { payments: { where: { period: startOfMonth } } },
        }),
        prisma.rentPayment.aggregate({
            where: { period: startOfMonth, status: 'PAID' },
            _sum: { amount: true }
        }),
        prisma.task.count({
            where: { status: { in: ['TODO', 'IN_PROGRESS'] }, tenantId: { not: null } }
        }),
        prisma.task.count({
            where: { status: { in: ['TODO', 'IN_PROGRESS'] }, tenantId: null }
        }),
        prisma.message.count({
            where: { fromTenant: true, readAt: null }
        }),
    ]);

    const activeLeasesThisMonth = leasesThisMonth.length;

    // A lease is considered paid if status=PAID or if paidAmount >= expected prorata (old bug fix)
    const fullyPaidCount = leasesThisMonth.filter(lease =>
        isRentSettled(lease.payments[0], expectedRentForPeriod(lease, startOfMonth))
    ).length;

    const pendingRents = activeLeasesThisMonth - fullyPaidCount;

    // Active leases count (by date, excludes future leases)
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [activeLeases, apartmentCount] = await Promise.all([
        prisma.lease.count({
            where: {
                startDate: { lte: todayMidnight },
                OR: [{ endDate: null }, { endDate: { gte: todayMidnight } }],
            },
        }),
        prisma.apartment.count(),
    ]);
    const occupancyRate = apartmentCount > 0 ? Math.round((activeLeases / apartmentCount) * 100) : 0;

    // Partial payments this month
    const partialPaymentsRaw = await prisma.rentPayment.findMany({
        where: { period: startOfMonth, status: 'PARTIAL' },
        include: { lease: { include: { tenant: true, apartment: true } } },
    });
    const partialPayments = partialPaymentsRaw
        .map(p => {
            const expectedAmount = expectedRentForPeriod(p.lease, startOfMonth);
            const paidAmount = (p as any).paidAmount ?? 0;
            const remaining = expectedAmount - paidAmount;
            // Skip if paidAmount already covers the expected amount (was incorrectly stored as PARTIAL)
            if (remaining < 0.01) return null;
            return {
                paymentId: p.id,
                amount: expectedAmount,
                paidAmount,
                remaining,
                tenant: { id: p.lease.tenant.id, firstName: p.lease.tenant.firstName, lastName: p.lease.tenant.lastName },
                apartment: { address: p.lease.apartment.address, name: p.lease.apartment.name },
                leaseId: p.leaseId,
            };
        })
        .filter(Boolean);

    // Incomplete GED (missing BAIL or EDL)
    const leasesWithDocs = await prisma.lease.findMany({
        where: {
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gte: todayMidnight } }],
        },
        include: { tenant: true, apartment: true, documents: true },
    });
    const incompleteGed = leasesWithDocs
        .filter(lease => {
            // Pas d'alerte GED sur un bail qui n'a pas encore commencé.
            if (new Date(lease.startDate) > todayMidnight) return false;
            const types = lease.documents.map(d => d.docType);
            return !types.includes('BAIL') || !types.includes('EDL');
        })
        .map(lease => {
            const types = lease.documents.map(d => d.docType);
            const missing = [!types.includes('BAIL') && 'bail', !types.includes('EDL') && 'état des lieux'].filter(Boolean) as string[];
            return {
                leaseId: lease.id,
                tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
                apartmentName: lease.apartment.name || lease.apartment.address,
                missing,
            };
        });

    // Rent review alerts
    const leasesForReview = await prisma.lease.findMany({
        where: {
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gte: todayMidnight } }],
        },
        include: { tenant: true, apartment: true },
    });
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const rentReviews = leasesForReview
        .filter(lease => {
            const start = new Date(lease.startDate);
            const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
            const isTimeForReview = monthsDiff >= 10 && monthsDiff % 12 === 10;
            const lastReview = lease.lastRentReviewDate ? new Date(lease.lastRentReviewDate) : null;
            const wasSentRecently = lastReview && lastReview > sixMonthsAgo;
            return isTimeForReview && !wasSentRecently;
        })
        .map(lease => ({
            leaseId: lease.id,
            tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
            apartmentName: lease.apartment.name || lease.apartment.address,
            startDate: lease.startDate.toISOString().split('T')[0],
        }));

    // Loyers impayés du mois, calculés depuis les baux : se baser sur les
    // RentPayment existants faisait disparaître l'alerte tant que la génération
    // des loyers n'avait pas tourné.
    const leasesForUnpaid = await prisma.lease.findMany({
        where: {
            startDate: { lte: todayMidnight },
            OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
        },
        include: {
            tenant: true,
            apartment: true,
            payments: { where: { period: startOfMonth } },
        },
    });

    const unpaidAll = leasesForUnpaid
        .map(lease => {
            const payment = lease.payments[0];
            const expected = expectedRentForPeriod(lease, startOfMonth);
            if (isRentSettled(payment, expected)) return null;
            const paid = payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
            return {
                lease,
                payment,
                remaining: Math.max(0, expected - paid),
                late: isRentLate(startOfMonth, lease.tenant.paymentDay, lease.startDate, now),
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

    // Impayés des mois passés : en retard par définition, sinon ils disparaissaient
    // du dashboard au changement de mois.
    const pastUnpaidRaw = await prisma.rentPayment.findMany({
        where: { period: { lt: startOfMonth }, status: { not: 'PAID' } },
        include: { lease: { include: { tenant: true, apartment: true } } },
        orderBy: { period: 'desc' },
        take: 20,
    });
    const pastUnpaid = pastUnpaidRaw
        .map(p => {
            const expected = expectedRentForPeriod(p.lease, p.period);
            if (isRentSettled(p, expected)) return null;
            const paid = p.status === 'PARTIAL' ? (p.paidAmount ?? 0) : 0;
            return { lease: p.lease, payment: p, remaining: Math.max(0, expected - paid), period: p.period };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

    const unpaidThisMonth = [
        ...pastUnpaid.map(r => ({ ...r, late: true })),
        ...unpaidAll.filter(r => r.late).map(r => ({ ...r, period: startOfMonth })),
    ].slice(0, 5);

    const pendingAmount = unpaidAll.reduce((sum, r) => sum + r.remaining, 0);

    return NextResponse.json({
        pendingRents,
        monthRevenue: paidPayments._sum.amount ?? 0,
        pendingAmount,
        openIncidents,
        openTasks,
        unreadMessages,
        activeLeases,
        apartmentCount,
        occupancyRate,
        currentMonth: startOfMonth.toISOString().slice(0, 7),
        rentReviews,
        incompleteGed,
        partialPayments,
        unpaidThisMonth: unpaidThisMonth.map(r => ({
            paymentId: r.payment?.id ?? null,
            amount: r.remaining,
            status: r.payment?.status ?? 'PENDING',
            tenant: { id: r.lease.tenant.id, firstName: r.lease.tenant.firstName, lastName: r.lease.tenant.lastName },
            apartment: { id: r.lease.apartment.id, address: r.lease.apartment.address, name: r.lease.apartment.name },
            leaseId: r.lease.id,
            period: new Date(r.period).toISOString().slice(0, 7),
        })),
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
