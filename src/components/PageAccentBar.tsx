'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { navColorFor } from '@/lib/nav-colors';

// useLayoutEffect côté client (avant peinture), useEffect en SSR pour éviter le warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Variables couleur posées sur <html> selon le menu courant.
// Doit rester cohérent avec le script inline de layout.tsx.
export function pageAccentVars(color: string): Record<string, string> {
    return {
        '--page-accent': color,
        '--page-tint': color,
        // les boutons "verts" (.std-add-button, .addButton, .paidButton…) et les
        // pastilles de succès dérivent de --pill-ok-*
        '--pill-ok-color': color,
        '--pill-ok-bg': `color-mix(in srgb, ${color} 12%, transparent)`,
        '--pill-ok-border': `color-mix(in srgb, ${color} 30%, transparent)`,
    };
}

const VAR_KEYS = Object.keys(pageAccentVars('#000'));

/**
 * Coloration de la page selon le menu courant (voir src/lib/nav-colors.ts) :
 *  - barre d'accent en haut, dégradée de gauche (pleine) à droite (transparente)
 *  - boutons d'action et pastilles de succès à la couleur du menu
 *  - fond de page légèrement teinté
 *
 * Variables posées AVANT peinture (useLayoutEffect) pour éviter que la transition
 * CSS ne fige une valeur intermédiaire ; le premier rendu SSR est couvert par le
 * script inline de layout.tsx.
 */
export default function PageAccentBar() {
    const pathname = usePathname();
    const color = navColorFor(pathname);

    useIsoLayoutEffect(() => {
        const s = document.documentElement.style;
        if (color) {
            const vars = pageAccentVars(color);
            for (const k of VAR_KEYS) s.setProperty(k, vars[k]);
        } else {
            for (const k of VAR_KEYS) s.removeProperty(k);
        }
    }, [color]);

    if (!color) return null;

    return (
        <div
            aria-hidden
            style={{
                height: 5,
                width: '100%',
                background: `linear-gradient(to right, ${color} 0%, ${color} 30%, transparent 100%)`,
            }}
        />
    );
}
