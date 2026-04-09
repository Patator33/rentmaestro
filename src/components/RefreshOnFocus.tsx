'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Rafraîchit silencieusement les Server Components quand :
 * - l'onglet redevient visible (retour depuis un autre onglet)
 * - l'intervalle de polling s'écoule (défaut : 60s)
 */
export default function RefreshOnFocus({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [router, intervalMs]);

  return null;
}
