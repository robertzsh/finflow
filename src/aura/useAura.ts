import { useStore } from '@/store/useStore';

/** The device is on Pink Aura: the pre-paint script / applyTheme put `pink` on <html>. */
export const isAuraDevice = () => typeof document !== 'undefined' && document.documentElement.classList.contains('pink');

/** True when the Pink Aura skin (src/aura) should render instead of the classic UI.
 *  Before data has loaded, the device theme on <html> decides. */
export function useAura() {
  const theme = useStore((s) => s.settings.theme);
  const ready = useStore((s) => s.ready);
  return ready ? theme === 'pink' : isAuraDevice();
}
