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

/** Coûts fixes de l'immeuble entier (crédit, assurance, taxe foncière). */
export const BUILDING_FIXED_COST_FIELDS = [
    { key: 'mortgageAmount', label: 'Mensualité crédit' },
    { key: 'insuranceAmount', label: 'Assurance PNO' },
    { key: 'taxAmount', label: 'Taxe foncière (mensuelle)' },
] as const;

export type BuildingExpenseKey = typeof BUILDING_EXPENSE_FIELDS[number]['key'];
export type BuildingFixedCostKey = typeof BUILDING_FIXED_COST_FIELDS[number]['key'];

type BuildingWithExpenses = { [K in BuildingExpenseKey]?: number | null };
type BuildingWithFixedCosts = { [K in BuildingFixedCostKey]?: number | null };

export function buildingExpensesTotal(building: BuildingWithExpenses): number {
    return BUILDING_EXPENSE_FIELDS.reduce((sum, f) => sum + (building[f.key] ?? 0), 0);
}

export function buildingFixedCostsTotal(building: BuildingWithFixedCosts): number {
    return BUILDING_FIXED_COST_FIELDS.reduce((sum, f) => sum + (building[f.key] ?? 0), 0);
}

/** Lit les 9 champs depuis un objet JSON (API mobile), en ignorant les valeurs absentes/invalides. */
export function parseExpenseFieldsFromRecord(body: Record<string, unknown>): Record<BuildingExpenseKey, number> {
    const out = {} as Record<BuildingExpenseKey, number>;
    for (const f of BUILDING_EXPENSE_FIELDS) {
        const raw = body[f.key];
        const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
        out[f.key] = isNaN(n) ? 0 : n;
    }
    return out;
}

/** Lit les 3 champs de coûts fixes depuis un objet JSON (API mobile). */
export function parseFixedCostFieldsFromRecord(body: Record<string, unknown>): Record<BuildingFixedCostKey, number> {
    const out = {} as Record<BuildingFixedCostKey, number>;
    for (const f of BUILDING_FIXED_COST_FIELDS) {
        const raw = body[f.key];
        const n = typeof raw === 'number' ? raw : parseFloat(raw as string);
        out[f.key] = isNaN(n) ? 0 : n;
    }
    return out;
}

type ApartmentWithOwnFixedCosts = BuildingWithFixedCosts & { buildingId?: string | null };
type BuildingForInheritance = BuildingWithFixedCosts & { apartments: { id: string }[] };

/**
 * Coûts fixes (crédit/assurance/taxe) réellement imputables à un appartement :
 * hérités de l'immeuble (répartis à parts égales) s'il y est rattaché, sinon
 * ses propres champs — repli pour un bien sans immeuble associé.
 */
export function apartmentFixedCosts(
    apartment: ApartmentWithOwnFixedCosts,
    building: BuildingForInheritance | null | undefined
): number {
    if (apartment.buildingId && building) {
        return buildingFixedCostsTotal(building) / Math.max(1, building.apartments.length);
    }
    return (apartment.mortgageAmount ?? 0) + (apartment.insuranceAmount ?? 0) + (apartment.taxAmount ?? 0);
}
