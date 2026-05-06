import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// GET — list of conversations (one per tenant, latest message + unread count)
export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const tenants = await prisma.tenant.findMany({
        where: { messages: { some: {} } },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            leases: {
                where: { isActive: true },
                include: { apartment: true },
                take: 1,
            },
        },
        orderBy: { updatedAt: 'desc' },
    });

    const unreadCounts = await prisma.message.groupBy({
        by: ['tenantId'],
        where: { fromTenant: true, readAt: null },
        _count: { id: true },
    });
    const unreadMap = Object.fromEntries(unreadCounts.map(r => [r.tenantId, r._count.id]));

    const result = tenants.map(t => ({
        tenantId: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        apartment: t.leases[0]?.apartment?.address ?? null,
        lastMessage: t.messages[0] ? {
            content: t.messages[0].content,
            fromTenant: t.messages[0].fromTenant,
            createdAt: t.messages[0].createdAt,
        } : null,
        unreadCount: unreadMap[t.id] ?? 0,
    }));

    // Sort by most recent message
    result.sort((a, b) => {
        const da = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const db = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return db - da;
    });

    return NextResponse.json(result);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
