export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    // Use 'fr-FR' locale for DD/MM/YYYY
    return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
