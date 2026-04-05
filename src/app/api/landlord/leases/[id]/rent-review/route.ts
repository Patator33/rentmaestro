import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!verifyMobileToken(request)) return unauthorized();
    const { id } = await params;

    await prisma.lease.update({
        where: { id },
        data: { lastRentReviewDate: new Date() },
    });

    return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
