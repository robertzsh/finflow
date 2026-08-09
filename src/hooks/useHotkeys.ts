import { useEffect } from 'react';

export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, deps: unknown[] = []) {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needMeta = parts.includes('mod');
    const onKey = (e: KeyboardEvent) => {
      const metaOk = needMeta ? (e.metaKey || e.ctrlKey) : true;
      if (metaOk && e.key.toLowerCase() === key) { handler(e); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
