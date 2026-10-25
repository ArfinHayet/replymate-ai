import { normalizeSeoPath, SITE_URL } from "./seo";

export const GA_MEASUREMENT_ID = "G-PTP6T5RXK3";
const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}` as const;

const trackedPaths = new Set([
  "/", "/terms", "/privacy", "/login", "/signup", "/upload", "/pdfs",
  "/images", "/images/upload", "/company", "/chat", "/chat-suggestions",
  "/chat-history", "/profile", "/profile-completion", "/embed", "/analytics",
  "/upgrade",
]);

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [DISABLE_KEY]?: boolean;
};

let lastPageLocation: string | null = null;

function sanitizedReferrer(referrer: string) {
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const path = normalizeSeoPath(url.pathname);
    const ownSite = url.hostname === "www.supportmate.online" || url.hostname === "supportmate.online";
    return ownSite && trackedPaths.has(path) ? `${SITE_URL}${path}` : `${url.origin}/`;
  } catch {
    return "";
  }
}

export function trackPageView(pathname: string) {
  if (!import.meta.env.PROD || !["www.supportmate.online", "supportmate.online"].includes(window.location.hostname)) {
    return;
  }

  const analyticsWindow = window as AnalyticsWindow;
  const path = normalizeSeoPath(pathname);
  const tracked = trackedPaths.has(path);
  analyticsWindow[DISABLE_KEY] = !tracked;
  if (!tracked) {
    lastPageLocation = null;
    return;
  }

  const pageLocation = `${SITE_URL}${path}`;
  if (lastPageLocation === pageLocation) return;

  const page = {
    page_location: pageLocation,
    page_title: document.title,
    page_referrer: lastPageLocation ?? sanitizedReferrer(document.referrer),
  };

  if (!analyticsWindow.gtag) {
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.gtag = function () {
      // Google tag commands require the standard Arguments object format.
      // eslint-disable-next-line prefer-rest-params
      analyticsWindow.dataLayer?.push(arguments);
    };
    analyticsWindow.gtag("js", new Date());
    analyticsWindow.gtag("config", GA_MEASUREMENT_ID, {
      ...page,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = document.createElement("script");
    script.id = "supportmate-google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.append(script);
  }

  analyticsWindow.gtag("set", page);
  analyticsWindow.gtag("event", "page_view", { ...page, send_to: GA_MEASUREMENT_ID });
  lastPageLocation = pageLocation;
}
