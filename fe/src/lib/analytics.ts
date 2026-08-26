declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Google Analytics measurement ID — override with `VITE_GA_MEASUREMENT_ID`. */
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "G-K0TQ6ZEB6C";

export const GA_BOOTSTRAP_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
`.trim();

function canTrack(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/** SPA page view — call on every client-side navigation. */
export function trackPageView(path: string, title?: string): void {
  if (!canTrack()) return;
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/** Custom event for feature usage (buttons, publishes, agent runs, etc.). */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (!canTrack()) return;
  window.gtag?.("event", eventName, params);
}

export function trackFeatureView(feature: string, path?: string): void {
  trackEvent("feature_view", {
    feature_name: feature,
    page_path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
  });
}
