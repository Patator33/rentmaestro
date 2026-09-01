'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { navColorFor } from './NavBar';

/**
 * Barre d'accent colorée en haut de la zone de contenu : la couleur du menu
 * courant (voir NAV_COLORS dans NavBar). Pose aussi `--page-accent` sur <html>
 * pour teinter d'autres éléments si besoin.
 */
export default function PageAccentBar() {
    const pathname = usePathname();
    const hidden = pathname.startsWith('/portal') || pathname.startsWith('/login') || pathname === '/setup';
    const color = navColorFor(pathname);

    useEffect(() => {
        const root = document.documentElement;
        if (color && !hidden) root.style.setProperty('--page-accent', color);
        else root.style.removeProperty('--page-accent');
        return () => { root.style.removeProperty('--page-accent'); };
    }, [color, hidden]);

    if (hidden || !color) return null;

    return (
        <div
            aria-hidden
            style={{
                height: 3,
                width: '100%',
                background: `linear-gradient(90deg, ${color}, ${color}00)`,
            }}
        />
    );
}
