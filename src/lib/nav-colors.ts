// Couleur associée à chaque menu. Source unique, partagée par :
//  - NavBar (teinte des items de la sidebar)
//  - PageAccentBar (barre d'accent + variables --page-accent / --page-tint)
//  - le script anti-flash inline de layout.tsx
// Ordre = ordre de test ; le préfixe le plus long l'emporte.
export const NAV_COLORS: [string, string][] = [
    ['/', '#3b82f6'],
    ['/apartments', '#22c55e'],
    ['/tenants', '#a855f7'],
    ['/rents', '#f59e0b'],
    ['/stats', '#ec4899'],
    ['/agenda', '#14b8a6'],
    ['/leases', '#6366f1'],
    ['/buildings', '#0ea5e9'],
    ['/travaux', '#ef4444'],
    ['/reconciliation', '#10b981'],
    ['/caf', '#0891b2'],
    ['/global-ged', '#eab308'],
    ['/companies', '#8b5cf6'],
    ['/contacts', '#f97316'],
    ['/gestion/parametres', '#64748b'],
];

const HIDDEN = (p: string) =>
    p.startsWith('/portal') || p.startsWith('/login') || p === '/setup';

export function navColorFor(pathname: string): string | null {
    if (HIDDEN(pathname)) return null;
    let best: string | null = null;
    let len = -1;
    for (const [href, color] of NAV_COLORS) {
        const match = href === '/' ? pathname === '/' : pathname.startsWith(href);
        if (match && href.length > len) {
            len = href.length;
            best = color;
        }
    }
    return best;
}
