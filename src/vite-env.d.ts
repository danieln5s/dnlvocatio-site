/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Browser-safe: Supabase project URL. */
  readonly VITE_SUPABASE_URL?: string;
  /** Browser-safe: Supabase publishable/anon key. Never the service role key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional override for the Edge Function base URL. */
  readonly VITE_SUPABASE_FUNCTIONS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
