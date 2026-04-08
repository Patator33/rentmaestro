import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// GET — tasks without tenant (travaux)
export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';

    const tasks = await prisma.task.findMany({
        where: {
            tenantId: null,
            ...(all ? {} : { status: { in: ['TODO', 'IN_PROGRESS'] } }),
        },
        include: {
            apartment: { select: { id: true, address: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
}

export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { title, description, cost, dueDate, apartmentId } = await request.json();
    if (!title || !apartmentId) {
        return NextResponse.json({ error: 'title et apartmentId sont requis' }, { status: 400 });
    }

    const task = await prisma.task.create({
        data: {
            title,
            description: description || null,
            cost: cost != null && cost !== '' ? parseFloat(cost) : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            apartmentId,
            status: 'TODO',
        },
        include: { apartment: { select: { id: true, address: true, name: true } } },
    });

    return NextResponse.json(task, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
