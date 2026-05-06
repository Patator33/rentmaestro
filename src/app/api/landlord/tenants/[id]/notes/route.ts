import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const notes = await prisma.tenantNote.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const { content, type } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Contenu requis.' }, { status: 400 });
    const note = await prisma.tenantNote.create({
        data: { tenantId: id, content: content.trim(), type: type || 'NOTE' },
    });
    return NextResponse.json(note, { status: 201 });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204 }); }
