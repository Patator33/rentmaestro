// Indice de Référence des Loyers (IRL) — révision annuelle des loyers.
//
// La règle légale : nouveau loyer = loyer en cours × (IRL nouveau / IRL de référence).
// L'IRL de référence est celui du trimestre prévu au bail (en général le trimestre
// de la date d'effet du bail), un an avant le nouvel indice.
//
// ⚠️ Les valeurs ci-dessous sont des valeurs par défaut éditables dans les paramètres.
// Elles DOIVENT être vérifiées et mises à jour depuis https://www.insee.fr (série IRL,
// base 100 = 4e trimestre 1998 / référence INSEE en vigueur).

export interface IrlIndex {
    quarter: string; // "2025-T1"
    value: number;   // 145.47
}

// Valeurs par défaut (à vérifier sur insee.fr — éditables dans Paramètres).
export const DEFAULT_IRL_INDICES: IrlIndex[] = [
    { quarter: '2023-T4', value: 142.06 },
    { quarter: '2024-T1', value: 143.46 },
    { quarter: '2024-T2', value: 145.17 },
    { quarter: '2024-T3', value: 145.47 },
    { quarter: '2024-T4', value: 146.66 },
    { quarter: '2025-T1', value: 147.46 },
    { quarter: '2025-T2', value: 148.10 },
];

export function quarterLabel(quarter: string): string {
    const [year, t] = quarter.split('-');
    const map: Record<string, string> = { T1: '1er trimestre', T2: '2e trimestre', T3: '3e trimestre', T4: '4e trimestre' };
    return `${map[t] ?? t} ${year}`;
}

// Returns the quarter string ("2025-T2") for a given date.
export function quarterForDate(date: Date): string {
    const q = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}-T${q}`;
}

// Same quarter, one year later: "2024-T2" -> "2025-T2".
export function quarterPlusOneYear(quarter: string): string {
    const [year, t] = quarter.split('-');
    return `${parseInt(year, 10) + 1}-${t}`;
}

export function findIndex(indices: IrlIndex[], quarter: string): IrlIndex | undefined {
    return indices.find(i => i.quarter === quarter);
}

export interface RevisionResult {
    oldRent: number;
    newRent: number;
    baseIndex: number;
    newIndex: number;
    baseQuarter: string;
    newQuarter: string;
    increase: number;
    increasePercent: number;
}

// Computes the revised rent. Rounded to 2 decimals as required by law.
export function computeRevision(
    oldRent: number,
    baseQuarter: string,
    baseIndex: number,
    newQuarter: string,
    newIndex: number
): RevisionResult {
    const newRent = Math.round((oldRent * newIndex / baseIndex) * 100) / 100;
    const increase = Math.round((newRent - oldRent) * 100) / 100;
    const increasePercent = Math.round(((newIndex / baseIndex - 1) * 100) * 100) / 100;
    return { oldRent, newRent, baseIndex, newIndex, baseQuarter, newQuarter, increase, increasePercent };
}
