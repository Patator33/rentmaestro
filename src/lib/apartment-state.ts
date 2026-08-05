import {
    expectedRentForPeriod,
    isRentSettled,
    isRentLate,
    unsettledPastRents,
} from '@/lib/rent-period';

/**
 * État d'un logement vis-à-vis du loyer, calculé **par logement** et non par bail.
 *
 * Raisonner sur les baux fausse tout compteur destiné au parc : un logement dont
 * le locataire change en cours de mois possède deux baux actifs sur la période et
 * serait compté deux fois. Toutes les vues qui affichent une répartition du parc
 * (barre d'occupation, liste des biens) doivent donc passer par ici.
 */
export type ApartmentStateCode = 'ok' | 'pending' | 'late' | 'vacant' | 'soon';

export type ApartmentState =
    | { code: 'ok' }
    | { code: 'pending' }
    | { code: 'late'; days: number }
    | { code: 'vacant' }
    | { code: 'soon' };

interface PaymentLike {
    id: string;
    period: Date;
    status: string;
    paidAmount?: number | null;
}

interface LeaseLike {
    startDate: Date | string;
    endDate: Date | string | null;
    rentAmount: number;
    chargesAmount: number;
    tenant: { paymentDay?: number | null };
    payments: PaymentLike[];
}

export interface ApartmentLike {
    leases: LeaseLike[];
}

/** Bail réellement en cours à la date donnée (ni futur, ni terminé). */
export function currentLeaseOf<L extends LeaseLike>(leases: L[], at: Date): L | undefined {
    return leases.find(l => {
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : null;
        return start <= at && (!end || end >= at);
    });
}

/** Bail signé mais pas encore commencé. */
export function futureLeaseOf<L extends LeaseLike>(leases: L[], at: Date): L | undefined {
    return leases.find(l => new Date(l.startDate) > at);
}

/**
 * @param currentPeriod premier jour du mois courant (UTC), comme les périodes stockées
 * @param today date de référence pour le calcul du retard
 */
export function apartmentState(
    apartment: ApartmentLike,
    currentPeriod: Date,
    today: Date = new Date()
): ApartmentState {
    const lease = currentLeaseOf(apartment.leases, today);
    if (!lease) {
        return futureLeaseOf(apartment.leases, today) ? { code: 'soon' } : { code: 'vacant' };
    }

    const dueDay = lease.tenant.paymentDay || 5;
    const expected = expectedRentForPeriod(lease, currentPeriod);
    const current = lease.payments.find(
        p => new Date(p.period).getTime() === currentPeriod.getTime()
    ) ?? null;
    const currentSettled = isRentSettled(current, expected);

    // Un mois passé jamais soldé prime : le retard se compte depuis le plus ancien.
    const past = unsettledPastRents([lease], currentPeriod);
    const oldestUnpaid = past.length > 0
        ? new Date(past[0].period)
        : currentSettled ? null : currentPeriod;

    if (!oldestUnpaid) return { code: 'ok' };

    const late = past.length > 0 || isRentLate(currentPeriod, dueDay, lease.startDate);
    if (!late) return { code: 'pending' };

    const dueDate = new Date(oldestUnpaid.getUTCFullYear(), oldestUnpaid.getUTCMonth(), dueDay);
    const days = Math.max(1, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
    return { code: 'late', days };
}

export interface OccupancyBreakdown {
    ok: number;
    pending: number;
    late: number;
    vacant: number;
    soon: number;
    /** Un état par logement, dans l'ordre d'affichage de la barre. */
    slots: ApartmentStateCode[];
    total: number;
}

/**
 * Répartition du parc par état. La somme des compteurs égale toujours le nombre
 * de logements fournis : c'est ce qui garantit que la barre et sa légende
 * racontent la même chose.
 */
export function occupancyBreakdown(
    apartments: ApartmentLike[],
    currentPeriod: Date,
    today: Date = new Date()
): OccupancyBreakdown {
    const counts = { ok: 0, pending: 0, late: 0, vacant: 0, soon: 0 };
    for (const apt of apartments) {
        counts[apartmentState(apt, currentPeriod, today).code]++;
    }
    // Ordre d'affichage : du plus sain au plus problématique.
    const order: ApartmentStateCode[] = ['ok', 'pending', 'late', 'soon', 'vacant'];
    const slots = order.flatMap(code => Array.from({ length: counts[code] }, () => code));
    return { ...counts, slots, total: apartments.length };
}
