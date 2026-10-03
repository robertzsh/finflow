import { useEffect, useState } from 'react';
import { isSameDay } from 'date-fns';

/** "Now", kept fresh for an app that stays open for days (installed PWA): re-checked
 *  at local midnight and whenever the app returns to the foreground. The Date only
 *  changes identity when the calendar day changes, so memos keyed on it stay cheap. */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setToday((prev) => {
      const now = new Date();
      return isSameDay(prev, now) ? prev : now;
    });
    const msToMidnight = () => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime() + 1000;
    };
    // Timers are paused while an iOS PWA is suspended, so the foreground checks matter as much.
    let timer = window.setTimeout(function tick() {
      refresh();
      timer = window.setTimeout(tick, msToMidnight());
    }, msToMidnight());
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
