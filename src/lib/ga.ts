// Minimal GA4 wrapper. Safe no-op if gtag isn't loaded or analytics were declined.

import { hasAnalyticsConsent } from "@/lib/consent";

declare global {
  interface Window {
    gtag?: (...args: [string, ...unknown[]]) => void;
  }
}

const MEASUREMENT_ID = "G-QTLPC7Z0BL";

const canSend = () =>
  typeof window !== "undefined" && typeof window.gtag === "function" && hasAnalyticsConsent();

/** Keys that must never reach GA4. */
const BLOCKED_KEY = /email|mail|token|otp|code|password|secret|auth|session|photo|image|src|url/i;

const isSensitiveValue = (value: unknown) =>
  typeof value === "string" && (value.includes("@") || value.startsWith("blob:"));

/**
 * Strips identity, credentials and private image references before anything is
 * handed to the analytics provider.
 */
export const sanitizeParams = (params: Record<string, unknown>): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (BLOCKED_KEY.test(key)) continue;
    if (isSensitiveValue(value)) continue;
    if (value !== null && typeof value === "object") continue;
    safe[key] = value;
  }

  return safe;
};

/** Drops any query string or fragment so codes and tokens can never be sent. */
export const sanitizePath = (path: string): string => path.split(/[?#]/)[0] || "/";

export const gtag = (...args: [string, ...unknown[]]) => {
  if (canSend()) {
    window.gtag!(...args);
  }
};

export const pageview = (path: string) => {
  if (canSend()) {
    window.gtag!("config", MEASUREMENT_ID, { page_path: sanitizePath(path) });
  }
};

export const event = (action: string, params: Record<string, unknown> = {}) => {
  if (canSend()) {
    window.gtag!("event", action, sanitizeParams(params));
  }
};

export default { gtag, pageview, event };
