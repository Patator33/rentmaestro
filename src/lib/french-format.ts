/**
 * Formatage à la française pour les documents générés (baux, actes de
 * cautionnement). Aucune dépendance : importable partout et testable seul.
 */

const UNITS = [
    'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };

/** `final` : le nombre termine l'énoncé (« quatre-vingts », « deux cents »). */
function below100(n: number, final: boolean): string {
    if (n < 20) return UNITS[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${UNITS[10 + u]}`;
    if (t === 9) return `quatre-vingt-${UNITS[10 + u]}`;
    if (t === 8) return u === 0 ? (final ? 'quatre-vingts' : 'quatre-vingt') : `quatre-vingt-${UNITS[u]}`;
    const base = TENS[t];
    if (u === 0) return base;
    return u === 1 ? `${base} et un` : `${base}-${UNITS[u]}`;
}

function below1000(n: number, final: boolean): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (h === 0) return below100(r, final);
    if (h === 1) return r ? `cent ${below100(r, final)}` : 'cent';
    return r ? `${UNITS[h]} cent ${below100(r, final)}` : `${UNITS[h]} cent${final ? 's' : ''}`;
}

/** Entier de 0 à 999 999 en toutes lettres (orthographe actuelle, avec traits d'union). */
export function integerToFrenchWords(n: number): string {
    if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n);
    if (n === 0) return 'zéro';
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    const thousands = th === 0 ? '' : th === 1 ? 'mille' : `${below1000(th, false)} mille`;
    const rest = r === 0 ? '' : below1000(r, true);
    return [thousands, rest].filter(Boolean).join(' ');
}

/** « cinq cent quatre-vingts euros », « douze euros et cinquante centimes ». */
export function amountToFrenchWords(amount: number): string {
    const cents = Math.round(amount * 100);
    const euros = Math.floor(cents / 100);
    const c = cents % 100;
    const e = `${integerToFrenchWords(euros)} euro${euros > 1 ? 's' : ''}`;
    return c ? `${e} et ${integerToFrenchWords(c)} centime${c > 1 ? 's' : ''}` : e;
}

/** 710 → « 710 », 710.5 → « 710,50 » (sans symbole). */
export function formatNumberFr(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}

/** 710 → « 710 € », 710.5 → « 710,50 € ». */
export function formatEuros(n: number): string {
    return `${formatNumberFr(n)} €`;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** JJ/MM/AAAA, sur la date UTC (les dates du bail sont stockées à minuit UTC). */
export function formatDateFr(d: Date): string {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** « 30 août 2026 » (« 1er septembre 2026 » pour le premier du mois). */
export function formatDateLongFr(d: Date): string {
    const day = d.getUTCDate();
    return `${day === 1 ? '1er' : day} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** « 30 août » : jour et mois d'une date anniversaire. */
export function formatDayMonthFr(d: Date): string {
    const day = d.getUTCDate();
    return `${day === 1 ? '1er' : day} ${MONTHS[d.getUTCMonth()]}`;
}

/** 12 → « 1 an », 36 → « 3 ans », 9 → « 9 mois ». */
export function durationLabel(months: number): string {
    if (months % 12 === 0) {
        const y = months / 12;
        return `${y} an${y > 1 ? 's' : ''}`;
    }
    return `${months} mois`;
}

/** « 2024-T4 » → « 4ème trimestre 2024 » (formulation des baux : 1er, 2ème, 3ème, 4ème). */
export function irlQuarterLabel(quarter: string): string {
    const [year, t] = quarter.split('-');
    const n = parseInt((t ?? '').replace('T', ''), 10);
    if (!Number.isFinite(n)) return quarter;
    return `${n === 1 ? '1er' : `${n}ème`} trimestre ${year}`;
}

/** Trimestre (« 2026-T1 ») précédant celui d'une date. */
export function previousQuarterOf(d: Date): string {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return q === 1 ? `${d.getUTCFullYear() - 1}-T4` : `${d.getUTCFullYear()}-T${q - 1}`;
}

/** Ajoute des mois à une date UTC, puis retire un jour : fin d'un bail. */
export function addMonthsMinusOneDay(start: Date, months: number): Date {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - 1);
    return d;
}
