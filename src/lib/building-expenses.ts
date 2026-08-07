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

export type BuildingExpenseKey = typeof BUILDING_EXPENSE_FIELDS[number]['key'];

type BuildingWithExpenses = { [K in BuildingExpenseKey]?: number | null };

export function buildingExpensesTotal(building: BuildingWithExpenses): number {
    return BUILDING_EXPENSE_FIELDS.reduce((sum, f) => sum + (building[f.key] ?? 0), 0);
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
