import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * When the project is not configured the site still renders — it simply stays
 * in the public state and the "View pictures" action explains why.
 */
export const isPhotoAccessConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isPhotoAccessConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Codes are entered in the UI; nothing is ever read from the URL.
        detectSessionInUrl: false,
        storageKey: "dnlvocatio.photo-access",
      },
      global: {
        headers: { "x-application-name": "dnlvocatio-site" },
      },
    })
  : null;

/** Base URL of the authenticated photo delivery path. */
export const functionsUrl = (): string => {
  const override = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim();
  if (override) return override.replace(/\/$/, "");
  if (!url) return "";
  return `${url.replace(/\/$/, "")}/functions/v1`;
};
