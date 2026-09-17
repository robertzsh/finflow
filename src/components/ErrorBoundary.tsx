import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

// A lazily-loaded chunk failed to load — almost always because a new version was
// deployed and the old hashed file this tab referenced no longer exists. Reloading
// pulls the fresh build. Guarded so a genuinely-broken deploy can't reload-loop.
const isChunkLoadError = (msg = '') =>
  /importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|Load failed/i.test(msg);

function reloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem('ff-chunk-reloaded')) return false; // already tried this session
    sessionStorage.setItem('ff-chunk-reloaded', '1');
    window.location.reload();
    return true;
  } catch { return false; }
}

// Also catch the failure before React does: Vite fires this when a dynamic import 404s.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); reloadOnceForStaleChunk(); });
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
    // Stale chunk after a deploy → auto-reload once instead of showing the error card.
    if (isChunkLoadError(error?.message) && reloadOnceForStaleChunk()) return;
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
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">😵‍💫</div>
          <h1 className="text-lg font-bold mb-1">Something went wrong</h1>
          <p className="text-sm text-white/60 mb-5">
            The app hit an unexpected error. Your data is safe — reloading usually fixes it.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-semibold px-4 py-2 hover:opacity-90">
              Reload
            </button>
            <button onClick={() => { this.setState({ error: null }); }}
              className="rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-semibold px-4 py-2 hover:bg-white/10">
              Try again
            </button>
          </div>
          <p className="mt-4 text-[11px] text-white/30 break-words">{this.state.error.message}</p>
        </div>
      </div>
    );
  }
}
