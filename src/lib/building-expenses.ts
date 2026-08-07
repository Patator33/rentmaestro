export const BUILDING_EXPENSE_FIELDS = [
    { key: 'expenseInternet', label: 'Internet' },
    { key: 'expenseElectricity', label: 'Électricité' },
    { key: 'expenseWater', label: 'Eau' },
    { key: 'expenseGas', label: 'Gaz' },
    { key: 'expenseMaintenance', label: 'Entretien' },
    { key: 'expenseAccountant', label: 'Comptable' },
    { key: 'expenseBank', label: 'Banque' },
    { key: 'expenseCleaning', label: 'Ménage' },
    { key: 'expenseOther', label: 'Autres' },
] as const;

/** Coûts fixes (crédit, assurance, taxe foncière). */
export const BUILDING_FIXED_COST_FIELDS = [
    { key: 'mortgageAmount', label: 'Mensualité crédit' },
    { key: 'insuranceAmount', label: 'Assurance PNO' },
    { key: 'taxAmount', label: 'Taxe foncière (mensuelle)' },
] as const;

/** Les 12 postes, communs à Building et Apartment (mêmes clés sur les deux modèles). */
export const ALL_COST_FIELDS = [...BUILDING_EXPENSE_FIELDS, ...BUILDING_FIXED_COST_FIELDS] as const;

export type BuildingExpenseKey = typeof BUILDING_EXPENSE_FIELDS[number]['key'];
export type BuildingFixedCostKey = typeof BUILDING_FIXED_COST_FIELDS[number]['key'];
export type CostFieldKey = typeof ALL_COST_FIELDS[number]['key'];

type CostFields = { [K in CostFieldKey]?: number | null };
type BuildingWithApartments = CostFields & { apartments: { id: string }[] };

export function buildingExpensesTotal(building: CostFields): number {
    return BUILDING_EXPENSE_FIELDS.reduce((sum, f) => sum + (building[f.key] ?? 0), 0);
}

export function buildingFixedCostsTotal(building: CostFields): number {
    return BUILDING_FIXED_COST_FIELDS.reduce((sum, f) => sum + (building[f.key] ?? 0), 0);
}

function parseFieldsFromRecord<K extends string>(body: Record<string, unknown>, fields: ReadonlyArray<{ key: K }>): Record<K, number> {
    const out = {} as Record<K, number>;
    for (const f of fields) {
        const raw = body[f.key];
        const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
        out[f.key] = isNaN(n) ? 0 : n;
    }
    return out;
}

/** Lit les 9 champs de charges depuis un objet JSON (API mobile). */
export function parseExpenseFieldsFromRecord(body: Record<string, unknown>): Record<BuildingExpenseKey, number> {
    return parseFieldsFromRecord(body, BUILDING_EXPENSE_FIELDS);
}

/** Lit les 3 champs de coûts fixes depuis un objet JSON (API mobile). */
export function parseFixedCostFieldsFromRecord(body: Record<string, unknown>): Record<BuildingFixedCostKey, number> {
    return parseFieldsFromRecord(body, BUILDING_FIXED_COST_FIELDS);
}

/** Lit les 12 champs depuis un objet JSON (API mobile, appartement). */
export function parseAllCostFieldsFromRecord(body: Record<string, unknown>): Record<CostFieldKey, number> {
    return parseFieldsFromRecord(body, ALL_COST_FIELDS);
}

/**
 * Un poste donné est-il piloté par l'immeuble ? C'est le cas dès que
 * l'immeuble renseigne une valeur non nulle pour ce champ précis — chaque
 * poste peut être mixte : certains hérités de l'immeuble, d'autres laissés à
 * la charge de chaque appartement.
 */
export function isFieldInherited(key: CostFieldKey, building: CostFields | null | undefined): boolean {
    return !!building && (building[key] ?? 0) > 0;
}

/**
 * Valeur effective d'un poste pour un appartement donné : quote-part héritée
 * de l'immeuble si celui-ci a renseigné ce poste, sinon la valeur propre de
 * l'appartement (repli poste par poste, pas tout ou rien).
 */
export function inheritedFieldValue(
    key: CostFieldKey,
    apartment: CostFields,
    building: BuildingWithApartments | null | undefined
): number {
    if (isFieldInherited(key, building)) {
        return ((building as BuildingWithApartments)[key] ?? 0) / Math.max(1, (building as BuildingWithApartments).apartments.length);
    }
    return apartment[key] ?? 0;
}

/** Somme des 12 postes réellement imputables à un appartement (mix hérité/propre). */
export function apartmentEffectiveCosts(
    apartment: CostFields,
    building: BuildingWithApartments | null | undefined
): number {
    return ALL_COST_FIELDS.reduce((sum, f) => sum + inheritedFieldValue(f.key, apartment, building), 0);
}

/**
 * Détail poste par poste affiché au niveau immeuble (carte immeuble, fiche
 * immeuble) : pour un poste qu'il renseigne, son montant plein ; sinon la
 * somme des valeurs propres de ses appartements pour ce poste.
 */
export function buildingCardCostsBreakdown(
    building: CostFields,
    apartments: CostFields[]
): Array<{ key: CostFieldKey; label: string; value: number }> {
    return ALL_COST_FIELDS.map(f => {
        const buildingVal = building[f.key] ?? 0;
        const value = buildingVal > 0 ? buildingVal : apartments.reduce((s, a) => s + (a[f.key] ?? 0), 0);
        return { key: f.key, label: f.label, value };
    });
}

/** Total affiché au niveau immeuble : somme du détail poste par poste. */
export function buildingCardCostsTotal(building: CostFields, apartments: CostFields[]): number {
    return buildingCardCostsBreakdown(building, apartments).reduce((sum, r) => sum + r.value, 0);
}
