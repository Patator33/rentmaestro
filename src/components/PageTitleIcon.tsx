'use client';

import { cloneElement, isValidElement } from 'react';
import { usePathname } from 'next/navigation';
import { navItemFor } from '@/components/nav-items';

/**
 * Icône du menu courant, à placer au début du <h1> d'une page :
 *   <h1><PageTitleIcon /> Mes Locataires</h1>
 * Prend la couleur du menu (--page-accent) et se dimensionne sur le texte.
 */
export default function PageTitleIcon({ size = '1.05em' }: { size?: string | number }) {
    const pathname = usePathname();
    const item = navItemFor(pathname);
    if (!item || !isValidElement(item.icon)) return null;

    const icon = cloneElement(item.icon as React.ReactElement<{ width?: string | number; height?: string | number }>, {
        width: size,
        height: size,
    });

    return (
        <span
            aria-hidden
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginRight: '0.5em',
                verticalAlign: '-0.14em',
                color: 'var(--page-accent, currentColor)',
                flexShrink: 0,
            }}
        >
            {icon}
        </span>
    );
}
