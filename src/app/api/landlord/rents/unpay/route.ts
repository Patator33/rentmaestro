import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// POST { paymentId }
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { paymentId } = await request.json();
    if (!paymentId) return NextResponse.json({ error: 'paymentId requis.' }, { status: 400 });

    await prisma.rentPayment.update({
        where: { id: paymentId },
        data: { status: 'PENDING', paidAt: null },
    });

    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
