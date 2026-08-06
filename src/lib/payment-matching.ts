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

export interface SenderMatch {
    confidence: MatchConfidence;
    /** Personne reconnue : le titulaire ou le colocataire. Vide si aucune. */
    matchedName: string;
    isCoTenant: boolean;
}

export const CONFIDENCE_ORDER: Record<MatchConfidence, number> = {
    none: 0, low: 1, medium: 2, high: 3, exact: 4,
};

// Un jeton court (« LE », « DE », initiale) est trop banal pour valoir
// rapprochement à lui seul.
const MIN_TOKEN_LENGTH = 3;

/**
 * Compare l'expéditeur d'un virement au titulaire du bail et à son colocataire.
 *
 * `exact`  : le libellé bancaire mémorisé correspond
 * `high`   : nom et prénom retrouvés
 * `medium` : nom de famille seul, même partiellement
 * `low`    : prénom seul — trop faible pour décider sans confirmation
 *
 * Les noms composés comptent dès qu'une de leurs parties significatives est
 * présente : une banque n'affiche souvent qu'un seul élément du nom, et un
 * prénom d'usage differe fréquemment de l'état civil.
 */
export function scoreSenderAgainstTenant(sender: string, tenant: NameCandidate): SenderMatch {
    const none: SenderMatch = { confidence: 'none', matchedName: '', isCoTenant: false };

    const senderTokens = tokens(sender);
    if (senderTokens.length === 0) return none;
    const senderSet = new Set(senderTokens);

    const fullName = (first: string, last: string) => `${first} ${last}`.trim();

    if (tenant.bankLabel && normalizeName(tenant.bankLabel) === normalizeName(sender)) {
        return {
            confidence: 'exact',
            matchedName: fullName(tenant.firstName, tenant.lastName),
            isCoTenant: false,
        };
    }

    const people = [
        { first: tenant.firstName, last: tenant.lastName, isCo: false },
    ];
    if (tenant.coTenantFirstName || tenant.coTenantLastName) {
        people.push({
            first: tenant.coTenantFirstName ?? '',
            last: tenant.coTenantLastName ?? '',
            isCo: true,
        });
    }

    let best = none;

    for (const person of people) {
        const firstTokens = tokens(person.first).filter(t => t.length >= MIN_TOKEN_LENGTH);
        const lastTokens = tokens(person.last).filter(t => t.length >= MIN_TOKEN_LENGTH);

        const lastHits = lastTokens.filter(t => senderSet.has(t)).length;
        const firstHits = firstTokens.filter(t => senderSet.has(t)).length;

        const lastComplete = lastTokens.length > 0 && lastHits === lastTokens.length;
        const lastPartial = lastHits > 0;
        const firstAny = firstHits > 0;

        let confidence: MatchConfidence = 'none';
        if (lastComplete && firstAny) confidence = 'high';
        else if (lastPartial && firstAny) confidence = 'high';
        else if (lastPartial) confidence = 'medium';
        else if (firstAny) confidence = 'low';

        if (CONFIDENCE_ORDER[confidence] > CONFIDENCE_ORDER[best.confidence]) {
            best = {
                confidence,
                matchedName: fullName(person.first, person.last),
                isCoTenant: person.isCo,
            };
        }
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
