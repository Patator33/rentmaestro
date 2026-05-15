import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';

/**
 * Automatically refreshes data when:
 * - The app comes back to foreground (Capacitor resume)
 * - A polling interval elapses (default: 60s)
 *
 * Uses a ref so the latest `load` function is always called,
 * even if it changes between renders (e.g. depends on local state).
 */
export function useAutoRefresh(load: () => void, intervalMs = 60000) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) loadRef.current();
    });
    const timer = setInterval(() => loadRef.current(), intervalMs);
    return () => {
      listenerPromise.then(l => l.remove());
      clearInterval(timer);
    };
  }, [intervalMs]);
}
