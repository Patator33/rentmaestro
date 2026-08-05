import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAutomationSecret, automationUnauthorized } from '@/lib/automation-auth';
import { expectedRentForPeriod, isRentSettled, PAST_MONTHS_SCANNED } from '@/lib/rent-period';
import { scoreSenderAgainstTenant, parseAmount, type MatchConfidence } from '@/lib/payment-matching';

export const dynamic = 'force-dynamic';

const RANK: Record<MatchConfidence, number> = { none: 0, low: 1, medium: 2, high: 3, exact: 4 };

/**
 * Rapproche un virement reçu d'un locataire et d'une période à créditer.
 * N'écrit rien : la décision revient à la validation humaine, puis à
 * /api/automation/confirm-payment.
 */
export async function POST(request: Request) {
    if (!verifyAutomationSecret(request)) return automationUnauthorized();

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });

    const sender: string = (body.sender ?? '').toString();
    const amount = typeof body.amount === 'number' ? body.amount : parseAmount(body.amount);

    if (!sender.trim()) return NextResponse.json({ error: 'Expéditeur manquant' }, { status: 400 });
    if (amount == null || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const scanFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - PAST_MONTHS_SCANNED, 1));

    // Baux ayant pu devoir un loyer sur la période examinée. Les locataires
    // archivés restent inclus : un virement de régularisation peut arriver
    // après le départ.
    const leases = await prisma.lease.findMany({
        where: {
            startDate: { lt: nextMonthStart },
            OR: [{ endDate: null }, { endDate: { gte: scanFrom } }],
        },
        include: {
            tenant: true,
            apartment: true,
            payments: { where: { period: { gte: scanFrom } } },
        },
    });

    const scored = leases
        .map(lease => ({ lease, confidence: scoreSenderAgainstTenant(sender, lease.tenant) }))
        .filter(c => c.confidence !== 'none')
        .sort((a, b) => RANK[b.confidence] - RANK[a.confidence]);

    if (scored.length === 0) {
        return NextResponse.json({
            matched: false,
            reason: 'Aucun locataire ne correspond à cet expéditeur',
            sender,
            amount,
        });
    }

    const candidates = scored.slice(0, 5).map(({ lease, confidence }) => {
        // Plus ancien mois non soldé : on solde les dettes avant le mois courant.
        let target: { period: Date; expected: number; alreadyPaid: number } | null = null;
        for (let back = PAST_MONTHS_SCANNED; back >= 0 && !target; back--) {
            const period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
            const periodEnd = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));
            if (new Date(lease.startDate) >= periodEnd) continue;
            if (lease.endDate && new Date(lease.endDate) < period) continue;

            const expected = expectedRentForPeriod(lease, period);
            if (expected <= 0) continue;

            const payment = lease.payments.find(p => p.period.getTime() === period.getTime()) ?? null;
            if (isRentSettled(payment, expected)) continue;

            const alreadyPaid = payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
            target = { period, expected, alreadyPaid };
        }

        const remaining = target ? Math.max(0, target.expected - target.alreadyPaid) : 0;

        return {
            leaseId: lease.id,
            tenantId: lease.tenant.id,
            tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
            apartment: lease.apartment.name || lease.apartment.address,
            confidence,
            bankLabelKnown: !!lease.tenant.bankLabel,
            // null quand tout est déjà soldé : le virement est alors une avance
            // ou un doublon, à traiter à la main.
            period: target ? target.period.toISOString().slice(0, 10) : null,
            periodLabel: target
                ? target.period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
                : null,
            expected: target ? Math.round(target.expected * 100) / 100 : null,
            alreadyPaid: target ? Math.round(target.alreadyPaid * 100) / 100 : 0,
            remaining: Math.round(remaining * 100) / 100,
            difference: target ? Math.round((amount - remaining) * 100) / 100 : null,
            settlesPeriod: target ? amount >= remaining - 0.01 : false,
        };
    });

    const best = candidates[0];
    const ambiguous = candidates.length > 1 && RANK[candidates[1].confidence] === RANK[best.confidence];

    return NextResponse.json({
        matched: true,
        sender,
        amount,
        ambiguous,
        best,
        candidates,
        currentMonth: currentMonthStart.toISOString().slice(0, 10),
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
