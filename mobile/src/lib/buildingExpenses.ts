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

export const ALL_COST_FIELDS = [...BUILDING_EXPENSE_FIELDS, ...BUILDING_FIXED_COST_FIELDS] as const;

export function buildingExpensesTotal(building: Record<string, any>): number {
  return BUILDING_EXPENSE_FIELDS.reduce((sum, f) => sum + (building?.[f.key] ?? 0), 0);
}

export function buildingFixedCostsTotal(building: Record<string, any>): number {
  return BUILDING_FIXED_COST_FIELDS.reduce((sum, f) => sum + (building?.[f.key] ?? 0), 0);
}

/** Un poste donné est-il piloté par l'immeuble ? Uniquement s'il y renseigne
 * une valeur non nulle pour ce champ précis — chaque poste peut être mixte. */
export function isFieldInherited(key: string, building: Record<string, any> | null | undefined): boolean {
  return !!building && (building[key] ?? 0) > 0;
}

/** Valeur effective d'un poste pour un appartement : quote-part héritée si
 * l'immeuble l'a renseigné, sinon la valeur propre de l'appartement. */
export function inheritedFieldValue(key: string, apartment: Record<string, any>, building: Record<string, any> | null | undefined): number {
  if (isFieldInherited(key, building)) {
    return (building![key] ?? 0) / Math.max(1, (building!.apartments ?? []).length);
  }
  return apartment?.[key] ?? 0;
}

/** Somme des 12 postes réellement imputables à un appartement (mix hérité/propre). */
export function apartmentEffectiveCosts(apartment: Record<string, any>, building: Record<string, any> | null | undefined): number {
  return ALL_COST_FIELDS.reduce((sum, f) => sum + inheritedFieldValue(f.key, apartment, building), 0);
}

/** Total au niveau immeuble : montant plein pour un poste qu'il renseigne,
 * sinon somme des valeurs propres de ses appartements pour ce poste. */
export function buildingCardCostsTotal(building: Record<string, any>, apartments: Record<string, any>[]): number {
  return ALL_COST_FIELDS.reduce((sum, f) => {
    const buildingVal = building?.[f.key] ?? 0;
    if (buildingVal > 0) return sum + buildingVal;
    return sum + apartments.reduce((s, a) => s + (a?.[f.key] ?? 0), 0);
  }, 0);
}
