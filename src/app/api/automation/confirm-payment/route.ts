import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAutomationSecret, automationUnauthorized } from '@/lib/automation-auth';
import { expectedRentForPeriod } from '@/lib/rent-period';
import { parseAmount } from '@/lib/payment-matching';
import { logAction } from '@/lib/audit';
import { notifyN8n } from '@/lib/n8n';

export const dynamic = 'force-dynamic';

/**
 * Enregistre un virement validé par le propriétaire.
 *
 * Écrit uniquement après confirmation humaine : l'appelant est une
 * automatisation, pas une source de vérité.
 */
export async function POST(request: Request) {
    if (!verifyAutomationSecret(request)) return automationUnauthorized();

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });

    const leaseId: string = (body.leaseId ?? '').toString();
    const periodStr: string = (body.period ?? '').toString();
    const amount = typeof body.amount === 'number' ? body.amount : parseAmount(body.amount);
    const sender: string = (body.sender ?? '').toString();
    const rememberLabel: boolean = body.rememberLabel !== false;

    if (!leaseId) return NextResponse.json({ error: 'leaseId manquant' }, { status: 400 });
    if (!periodStr) return NextResponse.json({ error: 'period manquante' }, { status: 400 });
    if (amount == null || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    const [y, m] = periodStr.split('-').map(Number);
    if (!y || !m) return NextResponse.json({ error: 'period invalide (attendu AAAA-MM-JJ)' }, { status: 400 });
    const period = new Date(Date.UTC(y, m - 1, 1));

    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { tenant: true, apartment: true },
    });
    if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 });

    const existing = await prisma.rentPayment.findFirst({ where: { leaseId, period } });
    // Recalculé depuis le bail plutôt que réutilisé depuis la ligne existante :
    // une ligne générée avant l'enregistrement d'un départ restait figée au
    // loyer plein, le prorata de sortie n'était jamais repris.
    const expected = expectedRentForPeriod(lease, period);

    // Cumul avec un éventuel acompte déjà enregistré sur cette période.
    const alreadyPaid = existing?.status === 'PARTIAL' && existing.paidAmount != null ? existing.paidAmount : 0;
    const totalPaid = alreadyPaid + amount;
    const isPartial = totalPaid < expected - 0.01;

    const data = {
        amount: expected,
        status: isPartial ? 'PARTIAL' : 'PAID',
        paidAt: new Date(),
        paidAmount: isPartial ? totalPaid : null,
    };

    const payment = existing
        ? await prisma.rentPayment.update({ where: { id: existing.id }, data })
        : await prisma.rentPayment.create({ data: { leaseId, period, ...data } });

    // Le libellé bancaire mémorisé rend les rapprochements suivants certains.
    let labelSaved = false;
    if (rememberLabel && sender.trim() && !lease.tenant.bankLabel) {
        await prisma.tenant.update({
            where: { id: lease.tenantId },
            data: { bankLabel: sender.trim() },
        });
        labelSaved = true;
    }

    const periodLabel = period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    await logAction({
        action: 'AUTO_RENT_PAID',
        entity: 'RentPayment',
        entityId: payment.id,
        details: `Virement ${amount.toFixed(2)} € — ${lease.tenant.firstName} ${lease.tenant.lastName} — ${periodLabel} — ${data.status}`,
    }).catch(() => {});

    notifyN8n('RENT_PAID', { ...payment, lease }).catch(() => {});

    revalidatePath('/rents');
    revalidatePath('/');

    return NextResponse.json({
        success: true,
        status: data.status,
        paymentId: payment.id,
        tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        apartment: lease.apartment.name || lease.apartment.address,
        period: period.toISOString().slice(0, 10),
        periodLabel,
        expected: Math.round(expected * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remaining: isPartial ? Math.round((expected - totalPaid) * 100) / 100 : 0,
        labelSaved,
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
