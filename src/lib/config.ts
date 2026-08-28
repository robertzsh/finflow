// Supabase keys are injected at build time from Vite env vars.
// If they are absent the app runs in local-only mode (IndexedDB), unchanged.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// VAPID public key for Web Push — injected at build time (GitHub Actions secret
// VITE_VAPID_PUBLIC_KEY, or a local .env). Nothing key-related is committed.
// If unset, the reminders feature is simply unavailable (the app degrades
// gracefully). The matching PRIVATE key lives only in the Supabase Edge Function
// secrets — never in the client.
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
