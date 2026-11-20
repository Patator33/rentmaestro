/**
 * Options et lecture de formulaires pour les données servant à générer les baux
 * (DocuSeal). Partagé par les Server Actions web et, plus tard, les routes mobiles.
 * Aucune dépendance serveur : importable aussi par les composants.
 */

export const LEASE_TYPES = [
    { value: 'NU', label: 'Location nue' },
    { value: 'MEUBLE', label: 'Location meublée' },
    { value: 'COLOCATION', label: 'Colocation (bail individuel meublé)' },
] as const;
export type LeaseType = (typeof LEASE_TYPES)[number]['value'];

/** Durée par défaut du bail, en mois, selon son type. */
export const DEFAULT_DURATION_MONTHS: Record<LeaseType, number> = {
    NU: 36,
    MEUBLE: 12,
    COLOCATION: 12,
};

export const CHARGES_MODES = [
    { value: 'PROVISION', label: 'Provision sur charges (régularisation annuelle)' },
    { value: 'FORFAIT', label: 'Forfait de charges' },
] as const;

export const HOUSING_TYPES = [
    { value: 'COLLECTIVE', label: 'Immeuble collectif' },
    { value: 'INDIVIDUAL', label: 'Immeuble individuel' },
] as const;

export const LEGAL_REGIMES = [
    { value: 'COPRO', label: 'Copropriété' },
    { value: 'MONO', label: 'Monopropriété' },
] as const;

export const HEATING_MODES = [
    { value: 'INDIVIDUAL', label: 'Individuel' },
    { value: 'COLLECTIVE', label: 'Collectif' },
] as const;

/** Équipements et parties communes cochables sur le bail. */
export const COMMON_EQUIPMENTS = [
    { key: 'parking', label: 'Parking' },
    { key: 'ascenseur', label: 'Ascenseur' },
    { key: 'gardiennage', label: 'Gardiennage' },
    { key: 'antenne_tv', label: 'Antenne TV collective' },
    { key: 'vide_ordures', label: 'Vide-ordures' },
    { key: 'interphone', label: 'Interphone' },
    { key: 'espaces_verts', label: 'Espace(s) vert(s)' },
    { key: 'chauffage_collectif', label: 'Chauffage collectif' },
    { key: 'eau_chaude_collective', label: 'Eau chaude collective' },
] as const;

export const NATIONALITY_DEFAULT = 'française';

// ── Lecture de formulaire ────────────────────────────────────────────────────

export function optStr(fd: FormData, key: string): string | null {
    const v = fd.get(key);
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t === '' ? null : t;
}

export function optFloat(fd: FormData, key: string): number | null {
    const s = optStr(fd, key);
    if (s === null) return null;
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

export function optInt(fd: FormData, key: string): number | null {
    const s = optStr(fd, key);
    if (s === null) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
}

/** Date saisie YYYY-MM-DD, stockée à minuit UTC. */
export function optDate(fd: FormData, key: string): Date | null {
    const s = optStr(fd, key);
    if (s === null) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/** Valeur d'une liste restreinte, sinon null. */
export function optEnum<T extends string>(fd: FormData, key: string, allowed: ReadonlyArray<T>): T | null {
    const s = optStr(fd, key);
    return s !== null && (allowed as ReadonlyArray<string>).includes(s) ? (s as T) : null;
}

/** Case à cocher HTML : présente dans le FormData seulement si cochée. */
export function checked(fd: FormData, key: string): boolean {
    const v = fd.get(key);
    return v === 'on' || v === 'true';
}

// ── Appartement ──────────────────────────────────────────────────────────────

export function readApartmentLeaseData(fd: FormData) {
    const keys = COMMON_EQUIPMENTS.map(e => e.key as string);
    const equipments = fd.getAll('commonEquipments').filter((v): v is string => typeof v === 'string' && keys.includes(v));
    return {
        rooms: optInt(fd, 'rooms'),
        floor: optStr(fd, 'floor'),
        doorCode: optStr(fd, 'doorCode'),
        cellarNumber: optStr(fd, 'cellarNumber'),
        hasParking: checked(fd, 'hasParking'),
        housingType: optEnum(fd, 'housingType', HOUSING_TYPES.map(o => o.value)),
        legalRegime: optEnum(fd, 'legalRegime', LEGAL_REGIMES.map(o => o.value)),
        constructionYear: optInt(fd, 'constructionYear'),
        heatingMode: optEnum(fd, 'heatingMode', HEATING_MODES.map(o => o.value)),
        hotWaterMode: optEnum(fd, 'hotWaterMode', HEATING_MODES.map(o => o.value)),
        commonEquipments: equipments.length ? Array.from(new Set(equipments)).join(',') : null,
        rentCapDecree: checked(fd, 'rentCapDecree'),
        rentComplement: checked(fd, 'rentComplement'),
        rentReferenceMajored: checked(fd, 'rentReferenceMajored'),
        rentReassessed: checked(fd, 'rentReassessed'),
        referenceRentPerM2: optFloat(fd, 'referenceRentPerM2'),
        referenceRentMajoredPerM2: optFloat(fd, 'referenceRentMajoredPerM2'),
        descPrivate: optStr(fd, 'descPrivate'),
        descCommon: optStr(fd, 'descCommon'),
        descEquipment: optStr(fd, 'descEquipment'),
        chargesDetail: optStr(fd, 'chargesDetail'),
        ictEquipment: optStr(fd, 'ictEquipment'),
        defaultLeaseType: optEnum(fd, 'defaultLeaseType', LEASE_TYPES.map(o => o.value)),
    };
}

export function parseEquipments(csv: string | null | undefined): string[] {
    return csv ? csv.split(',').map(s => s.trim()).filter(Boolean) : [];
}

// ── Immeuble ─────────────────────────────────────────────────────────────────

export function readBuildingHousingData(fd: FormData) {
    return {
        surface: optFloat(fd, 'surface'),
        rooms: optInt(fd, 'rooms'),
        housingType: optEnum(fd, 'housingType', HOUSING_TYPES.map(o => o.value)),
        legalRegime: optEnum(fd, 'legalRegime', LEGAL_REGIMES.map(o => o.value)),
        constructionYear: optInt(fd, 'constructionYear'),
    };
}

// ── Locataire ────────────────────────────────────────────────────────────────

export function readTenantIdentityData(fd: FormData) {
    return {
        birthDate: optDate(fd, 'birthDate'),
        birthPlace: optStr(fd, 'birthPlace'),
        address: optStr(fd, 'address'),
        coTenantBirthDate: optDate(fd, 'coTenantBirthDate'),
        coTenantBirthPlace: optStr(fd, 'coTenantBirthPlace'),
        coTenantAddress: optStr(fd, 'coTenantAddress'),
    };
}

// ── Société ──────────────────────────────────────────────────────────────────

export function readCompanyLeaseData(fd: FormData) {
    return {
        leaseDisplayName: optStr(fd, 'leaseDisplayName'),
        signerEmail: optStr(fd, 'signerEmail'),
    };
}

// ── Bail ─────────────────────────────────────────────────────────────────────

export type RentRulesOverride = {
    rentCapDecree?: boolean;
    rentComplement?: boolean;
    rentReferenceMajored?: boolean;
    rentReassessed?: boolean;
    referenceRentPerM2?: number | null;
    referenceRentMajoredPerM2?: number | null;
};

const RENT_RULE_BOOLS = ['rentCapDecree', 'rentComplement', 'rentReferenceMajored', 'rentReassessed'] as const;

/**
 * Exception « zone tendue » propre au bail. Désactivée (null) tant que la case
 * « Remplacer les valeurs de l'appartement » n'est pas cochée.
 */
export function readRentRulesOverride(fd: FormData): string | null {
    if (!checked(fd, 'rentRulesOverrideEnabled')) return null;
    const out: RentRulesOverride = {
        referenceRentPerM2: optFloat(fd, 'ovReferenceRentPerM2'),
        referenceRentMajoredPerM2: optFloat(fd, 'ovReferenceRentMajoredPerM2'),
    };
    for (const k of RENT_RULE_BOOLS) out[k] = checked(fd, `ov_${k}`);
    return JSON.stringify(out);
}

export function parseRentRulesOverride(json: string | null | undefined): RentRulesOverride | null {
    if (!json) return null;
    try {
        const v = JSON.parse(json);
        return v && typeof v === 'object' ? (v as RentRulesOverride) : null;
    } catch {
        return null;
    }
}

export function readLeaseGenerationData(fd: FormData) {
    const durationRaw = optInt(fd, 'durationMonths');
    return {
        leaseType: optEnum(fd, 'leaseType', LEASE_TYPES.map(o => o.value)),
        chargesMode: optEnum(fd, 'chargesMode', CHARGES_MODES.map(o => o.value)) ?? 'PROVISION',
        durationMonths: durationRaw !== null && durationRaw > 0 ? durationRaw : null,
        insurerName: optStr(fd, 'insurerName'),
        rentRulesOverride: readRentRulesOverride(fd),
    };
}

/** Détail du garant privé (naissance, adresse, nationalité) — nul pour Visale ou sans garant. */
export function readGuarantorDetails(fd: FormData, isPrivate: boolean) {
    if (!isPrivate) {
        return { guarantorBirthDate: null, guarantorBirthPlace: null, guarantorAddress: null, guarantorNationality: null };
    }
    return {
        guarantorBirthDate: optDate(fd, 'guarantorBirthDate'),
        guarantorBirthPlace: optStr(fd, 'guarantorBirthPlace'),
        guarantorAddress: optStr(fd, 'guarantorAddress'),
        guarantorNationality: optStr(fd, 'guarantorNationality') ?? NATIONALITY_DEFAULT,
    };
}

/** Date de fin par défaut : début + durée − 1 jour. */
export function computeLeaseEndDate(start: Date, months: number): Date {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - 1);
    return d;
}

// ── Réglages DocuSeal ────────────────────────────────────────────────────────

export const DOCUSEAL_SETTING_KEYS = {
    url: 'docuseal_url',
    apiKey: 'docuseal_api_key',
    webhookSecret: 'docuseal_webhook_secret',
    tplNu: 'docuseal_tpl_nu',
    tplMeuble: 'docuseal_tpl_meuble',
    tplColoc: 'docuseal_tpl_coloc',
    tplCaution: 'docuseal_tpl_caution',
    reminderDays: 'signature_reminder_days',
    reminderMax: 'signature_reminder_max',
} as const;

export const DEFAULT_SIGNATURE_REMINDER_DAYS = 3;
export const DEFAULT_SIGNATURE_REMINDER_MAX = 3;
