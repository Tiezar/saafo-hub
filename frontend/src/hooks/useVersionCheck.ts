import { useEffect, useState } from 'react';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useVersionCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json() as { version: string };
        if (mounted && version !== __BUILD_VERSION__) {
          setUpdateAvailable(true);
        }
      } catch {
        // network error — silently ignore
      }
    }

    function onVisibilityChange() {
      if (!document.hidden) check();
    }

    const interval = setInterval(check, POLL_INTERVAL);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return updateAvailable;
}
