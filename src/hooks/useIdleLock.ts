import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

/** Auto-lock the app (require PIN) after a period of inactivity. */
export function useIdleLock() {
  const { settings, locked, lock } = useStore();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!settings.pinEnabled || locked) return;
    const ms = Math.max(1, settings.sessionTimeoutMin) * 60 * 1000;
    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => lock(), ms);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [settings.pinEnabled, settings.sessionTimeoutMin, locked, lock]);
}
