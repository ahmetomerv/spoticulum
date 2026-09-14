import ReactGA from "react-ga4";

export const ANALYTICS_CONSENT_KEY = "spoticulum.analytics-consent";
export type AnalyticsConsent = "granted" | "denied";
type AnalyticsEvent = Parameters<typeof ReactGA.event>[0];

declare global {
  interface Window {
    [analyticsDisabledKey: `ga-disable-${string}`]: boolean;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const consent = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return consent === "granted" || consent === "denied" ? consent : null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(value: AnalyticsConsent): void {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // A blocked storage API must not prevent the service from working.
  }
}

export function enableAnalytics(measurementId?: string): void {
  if (!measurementId || getAnalyticsConsent() !== "granted") return;

  window[`ga-disable-${measurementId}`] = false;
  if (!ReactGA.isInitialized) {
    ReactGA.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    ReactGA.initialize(measurementId, {
      gaOptions: {
        anonymizeIp: true,
        allowAdFeatures: false,
        allowAdPersonalizationSignals: false,
      },
    });
  } else {
    ReactGA.gtag("consent", "update", { analytics_storage: "granted" });
  }
}

export function disableAnalytics(measurementId?: string): void {
  if (measurementId) window[`ga-disable-${measurementId}`] = true;
  if (ReactGA.isInitialized) {
    ReactGA.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name) continue;
    if (!name.startsWith("_ga")) continue;
    const expired = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = expired;
    document.cookie = `${expired}; Domain=${window.location.hostname}`;
    document.cookie = `${expired}; Domain=.${window.location.hostname}`;
  }
}

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  if (getAnalyticsConsent() === "granted" && ReactGA.isInitialized) {
    ReactGA.event(event);
  }
}
