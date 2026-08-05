/**
 * Rapprochement d'un virement bancaire avec un locataire.
 *
 * Le libellé d'un virement ne ressemble presque jamais au nom d'usage :
 * civilité en tête, nom de jeune fille, ordre inversé, accents absents. On
 * normalise donc des deux côtés avant de comparer, et on renvoie un niveau de
 * confiance plutôt qu'une réponse binaire — la validation humaine tranche.
 */

const CIVILITIES = new Set([
    'M', 'MR', 'MME', 'MLLE', 'MONSIEUR', 'MADAME', 'MADEMOISELLE', 'MISS', 'MS', 'MRS',
]);

/** Majuscules, sans accents, sans ponctuation, civilités retirées. */
export function normalizeName(raw: string): string {
    const cleaned = (raw || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();

    return cleaned
        .split(' ')
        .filter(t => t && !CIVILITIES.has(t))
        .join(' ');
}

function tokens(raw: string): string[] {
    return normalizeName(raw).split(' ').filter(Boolean);
}

export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low' | 'none';

export interface NameCandidate {
    bankLabel?: string | null;
    firstName: string;
    lastName: string;
    coTenantFirstName?: string | null;
    coTenantLastName?: string | null;
}

/**
 * Compare l'expéditeur d'un virement à un locataire.
 *
 * `exact`  : le libellé bancaire mémorisé correspond
 * `high`   : nom et prénom retrouvés (locataire ou colocataire)
 * `medium` : nom de famille seul
 * `low`    : prénom seul — trop faible pour décider sans confirmation
 */
export function scoreSenderAgainstTenant(sender: string, tenant: NameCandidate): MatchConfidence {
    const senderTokens = tokens(sender);
    if (senderTokens.length === 0) return 'none';
    const senderSet = new Set(senderTokens);

    if (tenant.bankLabel && normalizeName(tenant.bankLabel) === normalizeName(sender)) {
        return 'exact';
    }

    const people: Array<{ first: string; last: string }> = [
        { first: tenant.firstName, last: tenant.lastName },
    ];
    if (tenant.coTenantFirstName || tenant.coTenantLastName) {
        people.push({
            first: tenant.coTenantFirstName ?? '',
            last: tenant.coTenantLastName ?? '',
        });
    }

    let best: MatchConfidence = 'none';
    const rank: Record<MatchConfidence, number> = { none: 0, low: 1, medium: 2, high: 3, exact: 4 };

    for (const person of people) {
        const firstTokens = tokens(person.first);
        const lastTokens = tokens(person.last);
        // Un nom composé ne compte que si toutes ses parties sont présentes.
        const hasLast = lastTokens.length > 0 && lastTokens.every(t => senderSet.has(t));
        const hasFirst = firstTokens.length > 0 && firstTokens.every(t => senderSet.has(t));

        let score: MatchConfidence = 'none';
        if (hasLast && hasFirst) score = 'high';
        else if (hasLast) score = 'medium';
        else if (hasFirst) score = 'low';

        if (rank[score] > rank[best]) best = score;
    }

    return best;
}

/** Montant "252,00 EUR" ou "1 252,00" -> 252. Renvoie null si illisible. */
export function parseAmount(raw: string): number | null {
    if (!raw) return null;
    const cleaned = String(raw)
        .replace(/[^\d,.\-]/g, '')
        .replace(/\.(?=\d{3}\b)/g, '')
        .replace(',', '.');
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}
