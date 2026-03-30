import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const tenant = await prisma.tenant.findUnique({
        where: { portalToken: token },
        include: {
            tasks: { orderBy: { createdAt: 'desc' } },
            leases: {
                include: {
                    apartment: true,
                    payments: { orderBy: { period: 'desc' } },
                },
                orderBy: { startDate: 'desc' },
            },
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!tenant) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    return NextResponse.json(tenant);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
