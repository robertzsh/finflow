// Supabase keys are injected at build time from Vite env vars.
// If they are absent the app runs in local-only mode (IndexedDB), unchanged.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// VAPID public key for Web Push. This is meant to be public (it ships to the
// browser), so it's safe to commit. Override via VITE_VAPID_PUBLIC_KEY if you
// ever rotate the keypair. The matching private key lives only in the Supabase
// Edge Function secrets — never here.
export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  'BEN9kgA8-NiPWYttBZnCLhPmtyOqa_QBiT_Yc87d7j_tQ5_O8jmlcLFY7OWCbtLKqSg7HKkYNZ73lOOJOBNWhkI';
