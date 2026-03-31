import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// GET — message history for a tenant (marks tenant messages as read)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { tenantId } = await params;

    // Mark all unread tenant messages as read
    await prisma.message.updateMany({
        where: { tenantId, fromTenant: true, readAt: null },
        data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
    });

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, firstName: true, lastName: true },
    });

    return NextResponse.json({ tenant, messages });
}

// POST { content } — landlord sends a message
export async function POST(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { tenantId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
        return NextResponse.json({ error: 'Message vide.' }, { status: 400 });
    }

    const message = await prisma.message.create({
        data: { tenantId, content: content.trim(), fromTenant: false },
    });

    return NextResponse.json(message, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
