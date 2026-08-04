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
