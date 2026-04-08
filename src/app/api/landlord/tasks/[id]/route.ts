import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const { title, description, status, cost, dueDate } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (status !== undefined) data.status = status;
    if (cost !== undefined) data.cost = cost != null && cost !== '' ? parseFloat(cost) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({
        where: { id },
        data,
        include: { apartment: { select: { id: true, address: true, name: true } } },
    });

    return NextResponse.json(task);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(_request)) return unauthorized();

    const { id } = await params;
    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
