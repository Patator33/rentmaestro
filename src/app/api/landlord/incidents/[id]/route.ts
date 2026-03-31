import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// PATCH { status: "TODO" | "IN_PROGRESS" | "DONE" }
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const { status } = await request.json();

    if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }

    const task = await prisma.task.update({ where: { id }, data: { status } });
    return NextResponse.json(task);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
