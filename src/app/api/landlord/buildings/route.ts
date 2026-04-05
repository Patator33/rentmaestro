import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const buildings = await prisma.building.findMany({
        include: {
            company: { select: { id: true, name: true, type: true } },
            apartments: {
                include: {
                    leases: {
                        where: { isActive: true },
                        include: {
                            tenant: { select: { id: true, firstName: true, lastName: true } },
                        },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(buildings);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
