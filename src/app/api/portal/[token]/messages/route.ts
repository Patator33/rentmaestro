import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPortalMessage } from '@/actions/messages';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
        return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    }

    const result = await sendPortalMessage(tenant.id, content, token);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.message, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
