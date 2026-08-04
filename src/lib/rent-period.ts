interface LeaseAmounts {
    rentAmount: number;
    chargesAmount: number;
    startDate: Date | string;
    endDate?: Date | string | null;
}

/** Nombre de jours du mois d'une période (1er du mois). */
function daysInMonthOf(period: Date): number {
    return new Date(period.getFullYear(), period.getMonth() + 1, 0).getDate();
}

function isSameMonth(a: Date, period: Date): boolean {
    return a.getFullYear() === period.getFullYear() && a.getMonth() === period.getMonth();
}

/**
 * Montant dû par le locataire pour une période donnée, prorata compris.
 *
 * Deux prorata possibles, cumulables si le bail commence ET se termine dans le
 * même mois : entrée en cours de mois (le locataire ne paie que les jours
 * suivant son arrivée) et sortie en cours de mois (il ne paie que jusqu'à son
 * départ). Les conventions de comptage reprennent celles de calculateProrata
 * pour ne pas changer les montants déjà calculés sur les baux existants.
 */
export function expectedRentForPeriod(lease: LeaseAmounts, period: Date): number {
    const total = lease.rentAmount + lease.chargesAmount;
    const start = new Date(lease.startDate);
    const end = lease.endDate ? new Date(lease.endDate) : null;
    const daysInMonth = daysInMonthOf(period);

    const startsThisMonth = isSameMonth(start, period) && start.getDate() > 1;
    const endsThisMonth = end != null && isSameMonth(end, period);
    if (!startsThisMonth && !endsThisMonth) return Math.round(total * 100) / 100;

    const firstDay = startsThisMonth ? start.getDate() : 0;
    const lastDay = endsThisMonth ? end!.getDate() : daysInMonth;
    const occupiedDays = Math.max(0, lastDay - firstDay);

    return Math.round(((total / daysInMonth) * occupiedDays) * 100) / 100;
}

interface PaymentLike {
    status: string;
    paidAmount?: number | null;
}

/** Un loyer est soldé s'il est PAID, ou PARTIAL dont le cumulé couvre l'attendu. */
export function isRentSettled(payment: PaymentLike | null | undefined, expected: number): boolean {
    if (!payment) return false;
    if (payment.status === 'PAID') return true;
    if (payment.status === 'PARTIAL') return (payment.paidAmount ?? 0) >= expected - 0.01;
    return false;
}

/** Jours de tolérance après le jour de paiement habituel avant de parler de retard. */
export const LATE_GRACE_DAYS = 4;

/** Nombre de mois passés examinés à la recherche d'impayés. */
export const PAST_MONTHS_SCANNED = 12;

interface LeaseWithPayments extends LeaseAmounts {
    payments: Array<{ id: string; period: Date; status: string; paidAmount?: number | null }>;
}

export interface UnsettledRent<L> {
    id: string;
    amount: number;
    period: Date;
    lease: L;
    payment: { id: string; status: string; paidAmount?: number | null } | null;
}

/**
 * Loyers des mois passés qui n'ont jamais été soldés.
 *
 * Parcourt les mois plutôt que les seuls RentPayment enregistrés : un loyer que
 * la génération mensuelle n'a jamais créé reste dû, et se baser uniquement sur
 * les lignes existantes le rendait invisible partout.
 *
 * Nuance importante : un mois *sans* ligne en base n'est retenu que s'il s'agit
 * du mois précédent. Sinon un bail dont l'historique n'a jamais été saisi
 * ferait remonter douze mois de faux impayés d'un coup. Les mois ayant une
 * ligne réellement impayée sont eux tous retenus : c'est une dette suivie.
 */
export function unsettledPastRents<L extends LeaseWithPayments>(
    leases: L[],
    currentMonthStart: Date,
    monthsBack: number = PAST_MONTHS_SCANNED
): Array<UnsettledRent<L>> {
    const out: Array<UnsettledRent<L>> = [];

    for (const lease of leases) {
        const start = new Date(lease.startDate);
        const end = lease.endDate ? new Date(lease.endDate) : null;

        for (let back = monthsBack; back >= 1; back--) {
            const period = new Date(Date.UTC(
                currentMonthStart.getUTCFullYear(),
                currentMonthStart.getUTCMonth() - back,
                1
            ));
            // Hors période d'occupation : rien n'était dû.
            const periodEnd = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));
            if (start >= periodEnd) continue;
            if (end && end < period) continue;

            const expected = expectedRentForPeriod(lease, period);
            if (expected <= 0) continue;

            const payment = lease.payments.find(p => new Date(p.period).getTime() === period.getTime()) ?? null;
            // Aucune trace en base : on ne remonte que le mois précédent.
            if (!payment && back > 1) continue;
            if (isRentSettled(payment, expected)) continue;

            const paid = payment?.status === 'PARTIAL' ? (payment.paidAmount ?? 0) : 0;
            out.push({
                id: payment?.id ?? `${(lease as any).id}-${period.toISOString().slice(0, 7)}`,
                amount: Math.max(0, expected - paid),
                period,
                lease,
                payment,
            });
        }
    }

    return out;
}

/**
 * Retard calculé à l'affichage plutôt que lu depuis le statut LATE stocké :
 * ce statut n'est posé que par la génération des loyers, donc un loyer impayé
 * restait invisible tant que ce traitement n'avait pas tourné.
 */
export function isRentLate(
    period: Date,
    paymentDay: number | null | undefined,
    leaseStart: Date | string,
    now: Date = new Date()
): boolean {
    const start = new Date(leaseStart);
    if (start > now) return false;

    const dueDay = paymentDay || 5;
    const currentMonth = isSameMonth(now, period);
    // Période passée : le délai est forcément écoulé.
    if (!currentMonth) return period < now;

    return now.getDate() - dueDay > LATE_GRACE_DAYS;
}
