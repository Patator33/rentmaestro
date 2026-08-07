// Miroir de src/lib/building-expenses.ts (app web) : l'app mobile est un bundle
// Vite séparé, sans accès aux imports `@/lib/*` du projet Next.js.
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

export const BUILDING_FIXED_COST_FIELDS = [
  { key: 'mortgageAmount', label: 'Mensualité crédit' },
  { key: 'insuranceAmount', label: 'Assurance PNO' },
  { key: 'taxAmount', label: 'Taxe foncière (mensuelle)' },
] as const;

export function buildingExpensesTotal(building: Record<string, any>): number {
  return BUILDING_EXPENSE_FIELDS.reduce((sum, f) => sum + (building?.[f.key] ?? 0), 0);
}

export function buildingFixedCostsTotal(building: Record<string, any>): number {
  return BUILDING_FIXED_COST_FIELDS.reduce((sum, f) => sum + (building?.[f.key] ?? 0), 0);
}

/** Coûts fixes réellement imputables à un appartement : hérités de l'immeuble
 * (répartis à parts égales) s'il y est rattaché, sinon ses propres champs. */
export function apartmentFixedCosts(apartment: Record<string, any>, building: Record<string, any> | null | undefined): number {
  if (apartment?.buildingId && building) {
    return buildingFixedCostsTotal(building) / Math.max(1, (building.apartments ?? []).length);
  }
  return (apartment?.mortgageAmount ?? 0) + (apartment?.insuranceAmount ?? 0) + (apartment?.taxAmount ?? 0);
}
