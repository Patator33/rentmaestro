'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Rafraîchit silencieusement les Server Components quand l'onglet redevient
 * visible (retour depuis un autre onglet ou une autre app).
 *
 * Pas de polling périodique : un `router.refresh()` régulier rejoue l'animation
 * `page-enter` et fait sauter le contenu pendant la navigation, ce qui donne
 * l'impression que l'application se relance toute seule. Le rafraîchissement au
 * retour de focus suffit à garder les données à jour.
 */
export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [router]);

  return null;
}
