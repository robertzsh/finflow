import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Catches render/runtime errors anywhere below it and shows a friendly recovery
 *  screen instead of a blank page. (A single component crash otherwise unmounts
 *  the whole React tree — exactly the "blank screen" failure mode.) */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surfaced for logging / future error-monitoring (e.g. Sentry) integration.
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
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
