import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// GET — all open incidents (tasks with tenantId set)
export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';

    const tasks = await prisma.task.findMany({
        where: {
            tenantId: { not: null },
            ...(all ? {} : { status: { in: ['TODO', 'IN_PROGRESS'] } }),
        },
        include: {
            tenant: { select: { id: true, firstName: true, lastName: true } },
            apartment: { select: { id: true, address: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
