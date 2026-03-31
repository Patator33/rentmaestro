import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const now = new Date();
    const in21days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 21));

    // Upcoming tasks with dueDate
    const tasks = await prisma.task.findMany({
        where: {
            status: { in: ['TODO', 'IN_PROGRESS'] },
            dueDate: { not: null, lte: in21days },
        },
        include: { apartment: true, tenant: true },
        orderBy: { dueDate: 'asc' },
        take: 10,
    });

    // Échéancier: for each active lease, compute next payment due date
    const activeLeases = await prisma.lease.findMany({
        where: { isActive: true },
        include: { tenant: true, apartment: true },
    });

    const todayUTC = now.getUTCDate();
    const schedule = activeLeases.map(l => {
        const paymentDay = l.tenant.paymentDay ?? 5;
        let dueDate: Date;
        if (todayUTC <= paymentDay) {
            dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), paymentDay));
        } else {
            dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, paymentDay));
        }
        const daysUntil = Math.round((dueDate.getTime() - now.getTime()) / 86400000);
        return {
            leaseId: l.id,
            tenant: { id: l.tenant.id, firstName: l.tenant.firstName, lastName: l.tenant.lastName },
            apartment: { name: l.apartment.name, address: l.apartment.address },
            amount: l.rentAmount + l.chargesAmount,
            dueDate: dueDate.toISOString().split('T')[0],
            daysUntil,
        };
    }).sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({
        tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate!.toISOString().split('T')[0],
            daysUntil: Math.round((t.dueDate!.getTime() - now.getTime()) / 86400000),
            apartment: { name: t.apartment.name, address: t.apartment.address },
            tenant: t.tenant ? { id: t.tenant.id, firstName: t.tenant.firstName, lastName: t.tenant.lastName } : null,
        })),
        schedule,
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
