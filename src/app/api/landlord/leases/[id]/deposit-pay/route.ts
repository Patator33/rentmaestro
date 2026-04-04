import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const paidAmount = parseFloat(body.paidAmount);

    if (isNaN(paidAmount) || paidAmount <= 0) {
        return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    const lease = await prisma.lease.findUnique({ where: { id } });
    if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });

    const total = lease.depositAmount ?? 0;
    const alreadyPaid = lease.depositPaidAmount ?? 0;
    const totalPaid = alreadyPaid + paidAmount;
    const isComplete = totalPaid >= total;

    await prisma.lease.update({
        where: { id },
        data: {
            depositPaidAmount: isComplete ? null : totalPaid,
            depositStatus: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED',
        },
    });

    return NextResponse.json({ success: true, status: isComplete ? 'RECEIVED' : 'PARTIAL_RECEIVED' });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
