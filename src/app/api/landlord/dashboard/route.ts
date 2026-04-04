import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [activeLeasesThisMonth, paidPayments, openIncidents, openTasks, unreadMessages] = await Promise.all([
        prisma.lease.count({
            where: {
                startDate: { lt: nextMonth },
                OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
            }
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

    // pendingRents = active leases this month minus paid ones
    const paidThisMonth = await prisma.rentPayment.count({
        where: { period: startOfMonth, status: 'PAID' }
    });
    const pendingRents = activeLeasesThisMonth - paidThisMonth;

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
    const partialPayments = partialPaymentsRaw.map(p => ({
        paymentId: p.id,
        amount: p.amount,
        paidAmount: (p as any).paidAmount,
        remaining: p.amount - ((p as any).paidAmount ?? 0),
        tenant: { id: p.lease.tenant.id, firstName: p.lease.tenant.firstName, lastName: p.lease.tenant.lastName },
        apartment: { address: p.lease.apartment.address, name: p.lease.apartment.name },
        leaseId: p.leaseId,
    }));

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
        where: { period: startOfMonth, status: { in: ['PENDING', 'LATE'] } },
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
