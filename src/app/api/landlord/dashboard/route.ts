import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [pendingPayments, paidPayments, openIncidents, unreadMessages] = await Promise.all([
        prisma.rentPayment.count({
            where: { period: startOfMonth, status: { in: ['PENDING', 'LATE'] } }
        }),
        prisma.rentPayment.aggregate({
            where: { period: startOfMonth, status: 'PAID' },
            _sum: { amount: true }
        }),
        prisma.task.count({
            where: { status: { in: ['TODO', 'IN_PROGRESS'] }, tenantId: { not: null } }
        }),
        prisma.message.count({
            where: { fromTenant: true, readAt: null }
        }),
    ]);

    // Active leases count
    const activeLeases = await prisma.lease.count({ where: { isActive: true } });

    // Upcoming rents: leases active this month with PENDING/LATE payment
    const unpaidThisMonth = await prisma.rentPayment.findMany({
        where: { period: startOfMonth, status: { in: ['PENDING', 'LATE'] } },
        include: { lease: { include: { tenant: true, apartment: true } } },
        take: 5,
        orderBy: { createdAt: 'asc' },
    });

    // Pending rents for next month (not yet generated = active leases without payment for next month)
    const nextMonthStart = endOfMonth;
    const totalPendingAmount = await prisma.rentPayment.aggregate({
        where: { period: startOfMonth, status: { in: ['PENDING', 'LATE'] } },
        _sum: { amount: true }
    });

    return NextResponse.json({
        pendingRents: pendingPayments,
        monthRevenue: paidPayments._sum.amount ?? 0,
        pendingAmount: totalPendingAmount._sum.amount ?? 0,
        openIncidents,
        unreadMessages,
        activeLeases,
        currentMonth: startOfMonth.toISOString().slice(0, 7),
        unpaidThisMonth: unpaidThisMonth.map(p => ({
            paymentId: p.id,
            amount: p.amount,
            status: p.status,
            tenant: { id: p.lease.tenant.id, firstName: p.lease.tenant.firstName, lastName: p.lease.tenant.lastName },
            apartment: { id: p.lease.apartment.id, address: p.lease.apartment.address, name: p.lease.apartment.name },
        })),
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
