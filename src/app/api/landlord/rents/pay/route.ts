import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken, unauthorized } from '@/lib/mobile-auth';
import { notifyN8n } from '@/lib/n8n';
import { expectedRentForPeriod } from '@/lib/rent-period';

export const dynamic = 'force-dynamic';

// POST { leaseId, period: "YYYY-MM-DD", amount }
export async function POST(request: Request) {
    if (!verifyMobileToken(request)) return unauthorized();

    const { leaseId, period: periodStr, amount: paidAmount } = await request.json();
    if (!leaseId || !periodStr || !paidAmount) {
        return NextResponse.json({ error: 'leaseId, period et amount requis.' }, { status: 400 });
    }

    const period = new Date(periodStr);
    const existing = await prisma.rentPayment.findFirst({ where: { leaseId, period } });

    const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) return NextResponse.json({ error: 'Bail introuvable.' }, { status: 404 });
    // Recalculé depuis le bail plutôt que réutilisé depuis la ligne existante :
    // une ligne générée avant l'enregistrement d'un départ restait figée au
    // loyer plein, le prorata de sortie n'était jamais repris. Gère aussi bien
    // l'entrée que la sortie mi-mois (contrairement à l'ancien calcul local).
    const expectedAmount = expectedRentForPeriod(lease, period);

    // Accumulate with any prior partial payment
    const alreadyPaid = (existing?.status === 'PARTIAL' && existing?.paidAmount != null)
        ? (existing.paidAmount as number) : 0;
    const totalPaid = alreadyPaid + paidAmount;
    const isPartial = totalPaid < expectedAmount - 0.01;

    if (existing) {
        await prisma.rentPayment.update({
            where: { id: existing.id },
            data: { amount: expectedAmount, status: isPartial ? 'PARTIAL' : 'PAID', paidAt: new Date(), paidAmount: isPartial ? totalPaid : null } as any,
        });
    } else {
        await prisma.rentPayment.create({
            data: { leaseId, period, amount: expectedAmount, status: isPartial ? 'PARTIAL' : 'PAID', paidAt: new Date(), ...(isPartial ? { paidAmount: totalPaid } : {}) } as any,
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
