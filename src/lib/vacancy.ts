export interface VacancyPeriod {
    apartmentId: string;
    apartmentLabel: string;
    start: Date;
    end: Date;
    days: number;
    lostAmount: number;
}

interface ApartmentForVacancy {
    id: string;
    name: string | null;
    address: string;
    rent: number;
    charges: number;
    createdAt: Date;
    availableFrom: Date | null;
    soldAt: Date | null;
    leases: Array<{ startDate: Date; endDate: Date | null }>;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Vacance locative d'un appartement sur une période, bornée à sa disponibilité
 * réelle : avant `availableFrom` (ou sa création) et après une éventuelle
 * vente (`soldAt`), l'appartement n'était pas louable et ne doit pas compter
 * comme vacant. Retourne les jours possibles/vacants et le détail des
 * périodes creuses (pour affichage), montant perdu au prorata du loyer CC.
 */
export function computeApartmentVacancy(
    apt: ApartmentForVacancy,
    rangeStart: Date,
    rangeEnd: Date
): { possibleDays: number; vacantDays: number; periods: VacancyPeriod[] } {
    const availableFrom = apt.availableFrom ?? apt.createdAt;
    const boundStart = rangeStart > availableFrom ? rangeStart : availableFrom;
    const boundEnd = apt.soldAt && apt.soldAt < rangeEnd ? apt.soldAt : rangeEnd;

    if (boundStart >= boundEnd) return { possibleDays: 0, vacantDays: 0, periods: [] };

    const possibleDays = Math.ceil((boundEnd.getTime() - boundStart.getTime()) / DAY_MS);

    const intervals = apt.leases
        .map(l => ({
            start: l.startDate > boundStart ? l.startDate : boundStart,
            end: l.endDate && l.endDate < boundEnd ? l.endDate : boundEnd,
        }))
        .filter(iv => iv.start < iv.end)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const periods: VacancyPeriod[] = [];
    let cursor = boundStart;
    const dailyRate = (apt.rent + apt.charges) / 30;
    const label = apt.name || apt.address;

    for (const iv of intervals) {
        if (iv.start > cursor) {
            const days = Math.ceil((iv.start.getTime() - cursor.getTime()) / DAY_MS);
            periods.push({ apartmentId: apt.id, apartmentLabel: label, start: cursor, end: iv.start, days, lostAmount: dailyRate * days });
        }
        if (iv.end > cursor) cursor = iv.end;
    }
    if (cursor < boundEnd) {
        const days = Math.ceil((boundEnd.getTime() - cursor.getTime()) / DAY_MS);
        periods.push({ apartmentId: apt.id, apartmentLabel: label, start: cursor, end: boundEnd, days, lostAmount: dailyRate * days });
    }

    const vacantDays = periods.reduce((s, p) => s + p.days, 0);
    return { possibleDays, vacantDays, periods };
}
