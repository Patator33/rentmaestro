import React from "react";

// Source unique des entrées de navigation (sidebar + titres de page).
// Les couleurs doivent rester synchronisées avec src/lib/nav-colors.ts.

export interface NavItem {
    href: string;
    label: string;
    color: string;
    icon: React.ReactNode;
}

const svg = (paths: React.ReactNode) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {paths}
    </svg>
);

export const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Dashboard', color: '#3b82f6', icon: svg(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>) },
    { href: '/apartments', label: 'Biens', color: '#22c55e', icon: svg(<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /><path d="M10 21v-3h4v3" /></>) },
    { href: '/tenants', label: 'Locataires', color: '#a855f7', icon: svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.7-3.4 3.2-5 6-5s5.3 1.6 6 5" /><circle cx="17" cy="9" r="2.6" /><path d="M21 19c-.4-2.4-2-3.6-4-3.8" /></>) },
    { href: '/rents', label: 'Paiements', color: '#f59e0b', icon: svg(<><path d="M17 6.5A6 6 0 0 0 7 12a6 6 0 0 0 10 5.5" /><path d="M5 10h8M5 13.5h8" /></>) },
    { href: '/stats', label: 'Statistiques', color: '#ec4899', icon: svg(<><path d="M5 3h14v18l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L4 21V3" /><path d="M8 8h8M8 12h8M8 16h5" /></>) },
    { href: '/agenda', label: 'Calendrier', color: '#14b8a6', icon: svg(<><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>) },
];

export const MORE_ITEMS: NavItem[] = [
    { href: '/leases', label: 'Baux', color: '#6366f1', icon: svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h7M9 17h5" /></>) },
    { href: '/buildings', label: 'Immeubles', color: '#0ea5e9', icon: svg(<><rect x="3" y="7" width="8" height="14" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /><path d="M6 11h2M6 15h2M16 7h2M16 11h2M16 15h2" /></>) },
    { href: '/travaux', label: 'Travaux', color: '#ef4444', icon: svg(<><path d="M14.7 6.3a4 4 0 0 1-5 5L5 16v3h3l4.7-4.7a4 4 0 0 0 5-5z" /></>) },
    { href: '/reconciliation', label: 'Banque', color: '#10b981', icon: svg(<><path d="M3 10 12 4l9 6" /><path d="M5 10v9M19 10v9M9 10v9M15 10v9" /><path d="M3 21h18" /></>) },
    { href: '/caf', label: 'CAF', color: '#0891b2', icon: svg(<><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5" /></>) },
    { href: '/global-ged', label: 'GED', color: '#eab308', icon: svg(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>) },
    { href: '/companies', label: 'Sociétés', color: '#8b5cf6', icon: svg(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>) },
    { href: '/gestion/parametres', label: 'Paramètres', color: '#64748b', icon: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>) },
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...MORE_ITEMS];

// Contacts n'a pas d'entrée de sidebar mais partage l'icône Sociétés.
const EXTRA: NavItem[] = [
    { href: '/contacts', label: 'Contacts', color: '#f97316', icon: svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.7-3.4 3.2-5 6-5s5.3 1.6 6 5" /><circle cx="17" cy="9" r="2.6" /><path d="M21 19c-.4-2.4-2-3.6-4-3.8" /></>) },
];

export function navItemFor(pathname: string): NavItem | null {
    let best: NavItem | null = null;
    for (const item of [...ALL_NAV_ITEMS, ...EXTRA]) {
        const match = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        if (match && (!best || item.href.length > best.href.length)) best = item;
    }
    return best;
}
