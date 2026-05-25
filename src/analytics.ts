import { GOOGLE_ANALYTICS_ID } from "./config";

type GtagParams = Record<string, string | number | boolean | undefined>;
type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

let initialized = false;

export function initGoogleAnalytics() {
  if (initialized || !GOOGLE_ANALYTICS_ID || typeof window === "undefined") return;

  const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`;
  const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);

  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = scriptSrc;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ANALYTICS_ID, { send_page_view: false });
  initialized = true;
}

export function trackPageView(pageTitle: string, pagePath?: string) {
  if (!GOOGLE_ANALYTICS_ID || typeof window === "undefined" || !window.gtag) return;

  const path = pagePath || `${window.location.pathname}${window.location.search}`;

  window.gtag("event", "page_view", {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: path,
  });
}

export function trackEvent(name: string, params: GtagParams = {}) {
  if (!GOOGLE_ANALYTICS_ID || typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", name, params);
}
