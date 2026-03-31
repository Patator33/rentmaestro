import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;

    const lease = await prisma.lease.findUnique({
        where: { id },
        include: {
            tenant: true,
            apartment: true,
            payments: { orderBy: { period: 'desc' } },
        },
    });

    if (!lease) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
    return NextResponse.json(lease);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, rentAmount, chargesAmount, depositAmount, isActive } = body;

    const lease = await prisma.lease.update({
        where: { id },
        data: {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : null,
            rentAmount: rentAmount != null ? parseFloat(rentAmount) : undefined,
            chargesAmount: chargesAmount != null ? parseFloat(chargesAmount) : undefined,
            depositAmount: depositAmount != null ? parseFloat(depositAmount) : undefined,
            isActive: isActive != null ? Boolean(isActive) : undefined,
        },
    });

    return NextResponse.json(lease);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
