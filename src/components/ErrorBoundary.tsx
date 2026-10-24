import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props { children: ReactNode }
interface State { error: Error | null }

// A lazily-loaded chunk failed to load / resolved to a stale module — almost always
// because a new version was deployed and the old cached file this tab referenced is
// broken. The "_result.default" / "reading 'default'" shapes are React.lazy reading a
// module whose default export is missing (a mismatched chunk).
const isChunkLoadError = (msg = '') =>
  /importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|_result\.default|reading 'default'|reading "default"|Load failed/i.test(msg);

// Hard reset: drop the service-worker + all caches, then reload. This is what actually
// fixes a *persistent* crash where the SW keeps serving a bad cached chunk — a plain
// reload would just re-serve it. Guarded so it can't loop.
async function hardReset() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }
  } catch { /* ignore */ }
  window.location.reload();
}

function recoverOnceFromStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem('ff-chunk-reloaded')) return false; // already tried this session
    sessionStorage.setItem('ff-chunk-reloaded', '1');
  } catch { /* */ }
  hardReset();
  return true;
}

// Also catch the failure before React does: Vite fires this when a dynamic import 404s.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); recoverOnceFromStaleChunk(); });
}

/** Catches render/runtime errors anywhere below it and shows a friendly recovery
 *  screen instead of a blank page. (A single component crash otherwise unmounts
 *  the whole React tree — exactly the "blank screen" failure mode.) */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Stale chunk after a deploy → hard-reset + reload once instead of the error card.
    if (isChunkLoadError(error?.message) && recoverOnceFromStaleChunk()) return;
    // Surfaced for logging / future error-monitoring (e.g. Sentry) integration.
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // If a reload is already in flight for a stale chunk, render nothing (avoids a flash).
    if (isChunkLoadError(this.state.error.message) && (() => { try { return !!sessionStorage.getItem('ff-chunk-reloaded'); } catch { return false; } })()) {
      return null;
    }
    return (
      <div className="app-bg min-h-[100dvh] flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-8 text-center shadow-lift">
          <div className="text-4xl mb-3">😵‍💫</div>
          <h1 className="text-xl font-semibold mb-1">Something went wrong</h1>
          <p className="text-sm text-ink-muted mb-5">
            The app hit an unexpected error. Your data is safe — reloading usually fixes it.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => hardReset()}>Reload</Button>
            <Button variant="ghost" onClick={() => { this.setState({ error: null }); }}>Try again</Button>
          </div>
          <p className="selectable mt-4 text-2xs text-ink-muted break-words">{this.state.error.message}</p>
        </div>
      </div>
    );
  }
}
