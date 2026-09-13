import { beforeEach, describe, expect, test, vi } from "vitest";
import ReactGA from "react-ga4";
import {
  disableAnalytics,
  enableAnalytics,
  setAnalyticsConsent,
  trackAnalyticsEvent,
} from "./analytics";

vi.mock("react-ga4", () => ({
  default: {
    isInitialized: false,
    gtag: vi.fn(),
    initialize: vi.fn(),
    event: vi.fn(),
  },
}));

const measurementId = "G-TEST";

describe("analytics consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    ReactGA.isInitialized = false;
    ReactGA.gtag.mockClear();
    ReactGA.initialize.mockReset();
    ReactGA.initialize.mockImplementation(() => {
      ReactGA.isInitialized = true;
    });
    ReactGA.event.mockClear();
    delete window[`ga-disable-${measurementId}`];
  });

  test("does not initialize or send events before consent", () => {
    enableAnalytics(measurementId);
    trackAnalyticsEvent({ category: "main", action: "download" });
    expect(ReactGA.initialize).not.toHaveBeenCalled();
    expect(ReactGA.event).not.toHaveBeenCalled();
  });

  test("initializes after consent and stops after withdrawal", () => {
    setAnalyticsConsent("granted");
    enableAnalytics(measurementId);
    trackAnalyticsEvent({ category: "main", action: "download" });

    expect(ReactGA.initialize).toHaveBeenCalledOnce();
    expect(ReactGA.event).toHaveBeenCalledOnce();

    document.cookie = "_ga=test; Path=/";
    setAnalyticsConsent("denied");
    disableAnalytics(measurementId);
    trackAnalyticsEvent({ category: "main", action: "download" });

    expect(window[`ga-disable-${measurementId}`]).toBe(true);
    expect(document.cookie).not.toContain("_ga=");
    expect(ReactGA.event).toHaveBeenCalledOnce();
  });
});
