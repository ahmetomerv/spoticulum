import ReactGA from "react-ga4";

export const ANALYTICS_CONSENT_KEY = "spoticulum.analytics-consent";

export function getAnalyticsConsent() {
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(value) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // A blocked storage API must not prevent the service from working.
  }
}

export function enableAnalytics(measurementId) {
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

export function disableAnalytics(measurementId) {
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
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith("_ga")) continue;
    const expired = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = expired;
    document.cookie = `${expired}; Domain=${window.location.hostname}`;
    document.cookie = `${expired}; Domain=.${window.location.hostname}`;
  }
}

export function trackAnalyticsEvent(event) {
  if (getAnalyticsConsent() === "granted" && ReactGA.isInitialized) {
    ReactGA.event(event);
  }
}
