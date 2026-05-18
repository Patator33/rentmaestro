import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const notes = await prisma.taskNote.findMany({
        where: { taskId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    const note = await prisma.taskNote.create({
        data: { taskId: id, content: content.trim(), authorType: 'LANDLORD' },
    });
    return NextResponse.json(note);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
