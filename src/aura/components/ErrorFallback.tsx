import { Button } from '@/aura/components/ui/Button';

/** Pink Aura version of the crash screen (the classic ErrorBoundary renders it). */
export function AuraErrorFallback({ message, onReload, onRetry }: { message: string; onReload: () => void; onRetry: () => void }) {
  return (
    <div className="app-bg min-h-[100dvh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center shadow-lift">
        <div className="text-4xl mb-3">😵‍💫</div>
        <h1 className="text-xl font-semibold mb-1">Something went wrong</h1>
        <p className="text-sm text-ink-muted mb-5">
          The app hit an unexpected error. Your data is safe — reloading usually fixes it.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={onReload}>Reload</Button>
          <Button variant="ghost" onClick={onRetry}>Try again</Button>
        </div>
        <p className="selectable mt-4 text-2xs text-ink-muted break-words">{message}</p>
      </div>
    </div>
  );
}
