/** Origin allow-list for the authenticated photo endpoint. */

const DEFAULT_ORIGINS = [
  "https://dnlvocatio.com",
  "https://www.dnlvocatio.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowList = configured.length > 0 ? configured : DEFAULT_ORIGINS;

export const resolveOrigin = (req: Request): string | null => {
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  return allowList.includes(origin) ? origin : null;
};

export const corsHeaders = (req: Request): Record<string, string> => {
  const origin = resolveOrigin(req);
  if (!origin) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "600",
  };
};
