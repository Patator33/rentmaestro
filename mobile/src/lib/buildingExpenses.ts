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

export function buildingExpensesTotal(building: Record<string, any>): number {
  return BUILDING_EXPENSE_FIELDS.reduce((sum, f) => sum + (building?.[f.key] ?? 0), 0);
}
