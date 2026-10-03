# Local mode is a test sandbox, not a product mode

The real app runs on Supabase (auth, Postgres, realtime) for our two-member household. Building without the `VITE_SUPABASE_*` keys still produces a working app that keeps everything in IndexedDB and seeds demo data. We keep that local mode only so CI's Playwright tests can click through every page without a backend or real data. New features are built for cloud mode and only need to keep local mode loading and the E2E suite green; they do not need a local-only implementation.

## Considered Options

- **Drop local mode:** E2E would then need a dedicated test Supabase project or a mocked backend in CI, which is more setup and slower runs.
- **Keep full parity:** Every feature would need two code paths for a mode nobody uses for real.
