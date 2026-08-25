/* Service-worker registration + update detection.
   Calls onUpdate(registration) when a NEW version is installed and waiting. */
let registered = false;
let updating = false; // true only after the user chooses to reload

export function registerSW(onUpdate: (reg: ServiceWorkerRegistration) => void) {
  if (registered || !('serviceWorker' in navigator)) return;
  registered = true;

  const start = async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

      // A newer worker was already installed in a previous session and is waiting.
      if (reg.waiting && navigator.serviceWorker.controller) onUpdate(reg);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // "installed" + an existing controller means this is an update, not a first install.
          if (nw.state === 'installed' && navigator.serviceWorker.controller) onUpdate(reg);
        });
      });

      // Check for a new deploy every hour and whenever the app regains focus.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      window.addEventListener('focus', () => reg.update().catch(() => {}));
    } catch { /* ignore */ }
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  // When the new worker takes control (after we ask it to), reload once to pick up new assets.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updating) return; // ignore the first-ever install claiming the page
    window.location.reload();
  });
}

export function applyUpdate(reg: ServiceWorkerRegistration) {
  updating = true;
  reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
