/**
 * Analytics consent.
 *
 * Deliberately independent of photo access: declining analytics has no effect
 * on requesting a code, verifying it, or viewing photographs.
 */

export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "dnlvocatio.analytics-consent";

type Listener = (choice: ConsentChoice | null) => void;
const listeners = new Set<Listener>();

const isChoice = (value: unknown): value is ConsentChoice =>
  value === "granted" || value === "denied";

export const readConsent = (): ConsentChoice | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isChoice(stored) ? stored : null;
  } catch {
    return null;
  }
};

const MEASUREMENT_ID = "G-QTLPC7Z0BL";

let analyticsRequested = false;

/** Injects gtag.js. Only ever called after the visitor has allowed analytics. */
const loadAnalytics = (): void => {
  if (analyticsRequested || typeof document === "undefined") return;
  analyticsRequested = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

/** Mirrors the choice into Google Consent Mode. */
export const applyConsent = (choice: ConsentChoice): void => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("consent", "update", {
    analytics_storage: choice,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (choice === "granted") {
    loadAnalytics();
  }
};

export const setConsent = (choice: ConsentChoice): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private browsing or blocked storage: honour the choice for this page only.
  }
  applyConsent(choice);
  listeners.forEach((listener) => listener(choice));
};

export const subscribeConsent = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const hasAnalyticsConsent = (): boolean => readConsent() === "granted";
