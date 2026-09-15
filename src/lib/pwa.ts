/* Service-worker registration + update handling.
   Updates apply automatically: when a new version is waiting at load time we activate
   it and reload once, so a normal Cmd+R picks up the latest — no stuck "Update available"
   toast. If a new deploy lands *mid-session* we surface onUpdate() so the user can choose
   when to reload (we don't yank assets out from under active use). */
let registered = false;
let updating = false; // true only once we've asked a worker to activate

const RELOAD_GUARD = 'ff-sw-reload-ts';
// Prevents an activate→reload loop: only auto-apply if we didn't just do so.
const recentlyReloaded = () => {
  try { return Date.now() - Number(sessionStorage.getItem(RELOAD_GUARD) || 0) < 10_000; } catch { return false; }
};
const markReloading = () => { try { sessionStorage.setItem(RELOAD_GUARD, String(Date.now())); } catch { /* */ } };

export function registerSW(onUpdate: (reg: ServiceWorkerRegistration) => void) {
  if (registered || !('serviceWorker' in navigator)) return;
  registered = true;

  let notifiedFor: ServiceWorker | null = null;
  const notify = (reg: ServiceWorkerRegistration) => {
    if (!reg.waiting || reg.waiting === notifiedFor) return;
    notifiedFor = reg.waiting;
    onUpdate(reg);
  };
  const autoApply = (reg: ServiceWorkerRegistration) => {
    if (!reg.waiting) return;
    if (recentlyReloaded()) { notify(reg); return; } // activation likely failed → fall back to toast, no loop
    markReloading();
    updating = true;
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  const start = async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

      // A newer worker is already installed and waiting from a prior visit → apply it now,
      // so a plain reload lands the update instead of showing the toast forever.
      if (reg.waiting && navigator.serviceWorker.controller) autoApply(reg);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // "installed" + an existing controller = a mid-session update. Let the user
          // decide via the toast rather than reloading while they're working.
          if (nw.state === 'installed' && navigator.serviceWorker.controller) notify(reg);
        });
      });

      // Check for a new deploy every hour and whenever the app regains focus.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      window.addEventListener('focus', () => reg.update().catch(() => {}));
    } catch { /* ignore */ }
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  // When the new worker takes control, reload once to pick up the new assets.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updating) return; // ignore the first-ever install claiming the page
    window.location.reload();
  });
}

export function applyUpdate(reg: ServiceWorkerRegistration) {
  markReloading();
  updating = true;
  reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  // Fallback for browsers that don't fire controllerchange reliably (iOS PWAs).
  setTimeout(() => { try { window.location.reload(); } catch { /* */ } }, 1500);
}
