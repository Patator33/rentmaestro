import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { calculateFutureProrata } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

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
    const fullyPaidCount = leasesThisMonth.filter(lease => {
        const payment = lease.payments[0];
        if (!payment) return false;
        if (payment.status === 'PAID') return true;
        if (payment.status === 'PARTIAL') {
            const total = lease.rentAmount + lease.chargesAmount;
            const leaseStart = new Date(lease.startDate);
            const isFirstMonth = leaseStart >= startOfMonth && leaseStart < nextMonth;
            const prorata = isFirstMonth ? calculateFutureProrata(total, leaseStart) : null;
            const expected = prorata ? Math.round(prorata.amount * 100) / 100 : total;
            return ((payment as any).paidAmount ?? 0) >= expected - 0.01;
        }
        return false;
    }).length;

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
            const total = p.lease.rentAmount + p.lease.chargesAmount;
            const leaseStart = new Date(p.lease.startDate);
            const isFirstMonth = leaseStart >= startOfMonth && leaseStart < nextMonth;
            const prorata = isFirstMonth ? calculateFutureProrata(total, leaseStart) : null;
            const expectedAmount = prorata ? Math.round(prorata.amount * 100) / 100 : total;
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
        where: { isActive: true },
        include: { tenant: true, apartment: true, documents: true },
    });
    const incompleteGed = leasesWithDocs
        .filter(lease => {
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
        where: { isActive: true },
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

    // Upcoming rents: leases active this month with PENDING/LATE payment
    const unpaidThisMonthRaw = await prisma.rentPayment.findMany({
        where: {
            period: startOfMonth,
            status: { in: ['PENDING', 'LATE'] },
            lease: { startDate: { lte: now } },
        },
        include: { lease: { include: { tenant: true, apartment: true } } },
        take: 10,
        orderBy: { createdAt: 'asc' },
    });
    // Don't alert before the tenant's usual payment day for the current month
    const currentDay = now.getUTCDate();
    const unpaidThisMonth = unpaidThisMonthRaw.filter(p => currentDay > (p.lease.tenant.paymentDay || 5) + 4).slice(0, 5);

    const totalPendingAmount = await prisma.rentPayment.aggregate({
        where: { period: startOfMonth, status: { in: ['PENDING', 'LATE'] } },
        _sum: { amount: true }
    });

    return NextResponse.json({
        pendingRents,
        monthRevenue: paidPayments._sum.amount ?? 0,
        pendingAmount: totalPendingAmount._sum.amount ?? 0,
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
        unpaidThisMonth: unpaidThisMonth.map(p => ({
            paymentId: p.id,
            amount: p.amount,
            status: p.status,
            tenant: { id: p.lease.tenant.id, firstName: p.lease.tenant.firstName, lastName: p.lease.tenant.lastName },
            apartment: { id: p.lease.apartment.id, address: p.lease.apartment.address, name: p.lease.apartment.name },
            leaseId: p.leaseId,
            period: startOfMonth.toISOString().slice(0, 7),
        })),
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
