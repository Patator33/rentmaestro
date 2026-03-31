import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { notifyN8n } from '@/lib/n8n';

export const dynamic = 'force-dynamic';

// POST { leaseId, period: "YYYY-MM-DD", amount }
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { leaseId, period: periodStr, amount } = await request.json();
    if (!leaseId || !periodStr || !amount) {
        return NextResponse.json({ error: 'leaseId, period et amount requis.' }, { status: 400 });
    }

    const period = new Date(periodStr);
    const existing = await prisma.rentPayment.findFirst({ where: { leaseId, period } });

    if (existing) {
        await prisma.rentPayment.update({
            where: { id: existing.id },
            data: { status: 'PAID', paidAt: new Date(), amount },
        });
    } else {
        await prisma.rentPayment.create({
            data: { leaseId, period, amount, status: 'PAID', paidAt: new Date() },
        });
    }

    const paymentData = await prisma.rentPayment.findFirst({
        where: { leaseId, period },
        include: { lease: { include: { tenant: true, apartment: true } } },
    });
    if (paymentData) await notifyN8n('RENT_PAID', paymentData).catch(() => {});

    return NextResponse.json({ success: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
