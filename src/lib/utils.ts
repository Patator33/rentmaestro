export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

export function formatCurrency(amount: number): string {
    return amount.toFixed(2) + ' €';
}

/**
 * Calculate prorated rent for a partial month.
 * Returns null if no prorata applies (full month).
 */
export function calculateProrata(
    totalRent: number,
    startDate: Date,
    endDate: Date | null,
    referenceDate: Date = new Date()
): { amount: number; days: number; type: 'start' | 'end' } | null {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const ref = new Date(referenceDate);

    // Check for Start Prorata (current month is start month AND start > 1st)
    if (
        ref.getMonth() === start.getMonth() &&
        ref.getFullYear() === start.getFullYear() &&
        start.getDate() > 1
    ) {
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - start.getDate() + 1;
        const prorata = (totalRent / daysInMonth) * daysRemaining;
        return { amount: prorata, days: daysRemaining, type: 'start' };
    }

    // Check for End Prorata (current month is end month)
    if (
        end &&
        ref.getMonth() === end.getMonth() &&
        ref.getFullYear() === end.getFullYear()
    ) {
        const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
        const daysPresent = end.getDate();
        const prorata = (totalRent / daysInMonth) * daysPresent;
        return { amount: prorata, days: daysPresent, type: 'end' };
    }

    return null;
}

/**
 * Calculate prorata for a future lease start.
 * Always returns prorata if start is not the 1st.
 */
export function calculateFutureProrata(
    totalRent: number,
    startDate: Date
): { amount: number; days: number } | null {
    const start = new Date(startDate);
    if (start.getDate() <= 1) return null;

    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - start.getDate() + 1;
    const prorata = (totalRent / daysInMonth) * daysRemaining;
    return { amount: prorata, days: daysRemaining };
}
