import { prisma } from '@/lib/prisma';
import { expectedRentForPeriod, isRentSettled, PAST_MONTHS_SCANNED } from '@/lib/rent-period';
import { scoreSenderAgainstTenant, CONFIDENCE_ORDER, type MatchConfidence } from '@/lib/payment-matching';

export const CONFIDENCE_RANK = CONFIDENCE_ORDER;

export interface TransferCandidate {
    leaseId: string;
    tenantId: string;
    tenantName: string;
    apartment: string;
    confidence: MatchConfidence;
    /** Personne reconnue dans le libellé : titulaire ou colocataire. */
    matchedName: string;
    isCoTenant: boolean;
    bankLabelKnown: boolean;
    /** null quand plus rien n'est dû : virement en avance ou doublon. */
    period: string | null;
    periodLabel: string | null;
    expected: number | null;
    alreadyPaid: number;
    remaining: number;
    difference: number | null;
    settlesPeriod: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function monthLabel(period: Date): string {
    return period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

type LeaseWithRelations = Awaited<ReturnType<typeof loadLeases>>[number];

async function loadLeases() {
    const now = new Date();
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const scanFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - PAST_MONTHS_SCANNED, 1));

    // Les locataires archivés restent inclus : une régularisation peut arriver
    // après le départ.
    return prisma.lease.findMany({
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
}

/** Plus ancien mois non soldé du bail : on éteint les dettes avant le mois courant. */
function oldestUnsettled(lease: LeaseWithRelations) {
    const now = new Date();
    for (let back = PAST_MONTHS_SCANNED; back >= 0; back--) {
        const period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
        const periodEnd = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));
        if (new Date(lease.startDate) >= periodEnd) continue;
        if (lease.endDate && new Date(lease.endDate) < period) continue;

        const expected = expectedRentForPeriod(lease, period);
        if (expected <= 0) continue;

        const payment = lease.payments.find(p => p.period.getTime() === period.getTime()) ?? null;
        if (isRentSettled(payment, expected)) continue;

        const alreadyPaid = payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
        return { period, expected, alreadyPaid };
    }
    return null;
}

function toCandidate(
    lease: LeaseWithRelations,
    match: { confidence: MatchConfidence; matchedName: string; isCoTenant: boolean },
    amount: number
): TransferCandidate {
    const target = oldestUnsettled(lease);
    const remaining = target ? Math.max(0, target.expected - target.alreadyPaid) : 0;

    return {
        leaseId: lease.id,
        tenantId: lease.tenant.id,
        tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        apartment: lease.apartment.name || lease.apartment.address,
        confidence: match.confidence,
        matchedName: match.matchedName,
        isCoTenant: match.isCoTenant,
        bankLabelKnown: !!lease.tenant.bankLabel,
        period: target ? target.period.toISOString().slice(0, 10) : null,
        periodLabel: target ? monthLabel(target.period) : null,
        expected: target ? round2(target.expected) : null,
        alreadyPaid: round2(target?.alreadyPaid ?? 0),
        remaining: round2(remaining),
        difference: target ? round2(amount - remaining) : null,
        settlesPeriod: target ? amount >= remaining - 0.01 : false,
    };
}

export interface TransferMatch {
    matched: boolean;
    best: TransferCandidate | null;
    candidates: TransferCandidate[];
    ambiguous: boolean;
    /** Loyers non soldés proposés quand l'expéditeur n'est reconnu de personne. */
    fallback: TransferCandidate[];
}

/**
 * Rapproche un virement d'un locataire. Ne modifie rien : la décision revient
 * à la validation humaine.
 */
export async function matchTransfer(sender: string, amount: number): Promise<TransferMatch> {
    const leases = await loadLeases();

    const scored = leases
        .map(lease => ({ lease, match: scoreSenderAgainstTenant(sender, lease.tenant) }))
        .filter(c => c.match.confidence !== 'none')
        .sort((a, b) => CONFIDENCE_RANK[b.match.confidence] - CONFIDENCE_RANK[a.match.confidence]);

    if (scored.length > 0) {
        const candidates = scored.slice(0, 5).map(({ lease, match }) => toCandidate(lease, match, amount));
        const ambiguous = candidates.length > 1
            && CONFIDENCE_RANK[candidates[1].confidence] === CONFIDENCE_RANK[candidates[0].confidence];
        return { matched: true, best: candidates[0], candidates, ambiguous, fallback: [] };
    }

    // Aucun nom ne correspond : proposer les loyers non soldés, le montant le
    // plus proche en premier.
    const fallback = leases
        .map(lease => toCandidate(lease, { confidence: 'none', matchedName: '', isCoTenant: false }, amount))
        .filter(c => c.period !== null)
        .sort((a, b) => Math.abs(a.remaining - amount) - Math.abs(b.remaining - amount))
        .slice(0, 6);

    return { matched: false, best: null, candidates: [], ambiguous: false, fallback };
}
