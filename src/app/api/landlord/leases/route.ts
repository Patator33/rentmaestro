import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const leases = await prisma.lease.findMany({
        include: {
            tenant: { select: { id: true, firstName: true, lastName: true } },
            apartment: { select: { id: true, address: true, name: true } },
            payments: { orderBy: { period: 'desc' }, take: 1 },
        },
        orderBy: { startDate: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leasesWithStatus = leases.map(l => ({
        ...l,
        isActive: new Date(l.startDate) <= today && (!l.endDate || new Date(l.endDate) >= today),
    }));

    return NextResponse.json(leasesWithStatus);
}

export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const body = await request.json();
    const { apartmentId, tenantId, startDate, endDate, rentAmount, chargesAmount, depositAmount } = body;

    if (!apartmentId || !tenantId || !startDate || rentAmount == null || chargesAmount == null) {
        return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    const lease = await prisma.lease.create({
        data: {
            apartmentId,
            tenantId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            rentAmount: parseFloat(rentAmount),
            chargesAmount: parseFloat(chargesAmount),
            depositAmount: depositAmount ? parseFloat(depositAmount) : null,
            depositStatus: depositAmount ? 'PENDING' : null,
            isActive: true,
        },
    });

    return NextResponse.json(lease, { status: 201 });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
