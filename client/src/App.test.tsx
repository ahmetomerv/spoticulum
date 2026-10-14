import { act, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import ReactGA from "react-ga4";
import App from "./App";
import {
  ANALYTICS_CONSENT_KEY,
  trackAnalyticsEvent,
} from "./platform/analytics";

vi.mock("react-ga4", () => ({
  default: {
    isInitialized: false,
    gtag: vi.fn(),
    initialize: vi.fn(),
    event: vi.fn(),
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  ReactGA.isInitialized = false;
  vi.mocked(ReactGA.initialize).mockImplementation(() => {
    ReactGA.isInitialized = true;
  });
  window.history.replaceState({}, "", "/");
  document.title = "Spoticulum";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "Not authenticated" }, { status: 401 }),
    ),
  );
});

test("new visitors can reach both choices in a non-modal analytics notice", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App analyticsMeasurementId="G-TEST" />
    </MemoryRouter>,
  );

  expect(screen.queryByRole("dialog", { name: /analytics/i })).toBeNull();
  const notice = screen.getByRole("region", { name: "Optional analytics" });
  expect(notice).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Optional analytics" }),
  ).toHaveFocus();
  expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
  expect(ReactGA.initialize).not.toHaveBeenCalled();

  await user.tab();
  expect(
    within(notice).getByRole("link", { name: "Privacy Policy" }),
  ).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Decline" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Allow analytics" })).toHaveFocus();
  await user.keyboard("{Enter}");

  expect(
    screen.queryByRole("region", { name: "Optional analytics" }),
  ).toBeNull();
  expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
  expect(ReactGA.initialize).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("button", { name: "Privacy settings" }),
  ).toHaveFocus();
});

test("withdrawing consent from Privacy settings restores focus and stops events", async () => {
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App analyticsMeasurementId="G-TEST" />
    </MemoryRouter>,
  );

  const settings = screen.getByRole("button", { name: "Privacy settings" });
  expect(
    screen.queryByRole("region", { name: "Optional analytics" }),
  ).toBeNull();
  expect(ReactGA.initialize).toHaveBeenCalledOnce();

  settings.focus();
  await user.keyboard("{Enter}");
  const notice = screen.getByRole("region", { name: "Optional analytics" });
  expect(
    screen.getByRole("heading", { name: "Optional analytics" }),
  ).toHaveFocus();
  await user.tab();
  expect(
    within(notice).getByRole("link", { name: "Privacy Policy" }),
  ).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Decline" })).toHaveFocus();
  await user.keyboard("{Enter}");

  expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
  expect(window[`ga-disable-G-TEST`]).toBe(true);
  expect(settings).toHaveFocus();
  trackAnalyticsEvent({ category: "main", action: "download" });
  expect(ReactGA.event).not.toHaveBeenCalled();
});

const signedInProfile = {
  id: "listener",
  display_name: "Test Listener",
  images: [{ url: "profile.png" }],
  external_urls: { spotify: "https://open.spotify.com/user/listener" },
};

test("preserves the login screen and legal navigation", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", { name: "Connect with Spotify" }),
  ).toBeVisible();
  expect(
    screen.getByText(/Spotify is a trademark of Spotify AB/),
  ).toBeVisible();
  await user.click(
    screen.getByRole("link", { name: "Terms of Service & Privacy Policy" }),
  );
  expect(
    screen.getByText(/not affiliated with, authorized by, endorsed by/),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Spoticulum" })).toHaveAttribute(
    "href",
    "https://spoticulum.ahmeto.com",
  );
  expect(screen.getAllByText("13 September 2026")).toHaveLength(2);
  expect(
    screen.getByText(
      /keeps the resulting access and refresh tokens in volatile server memory/,
    ),
  ).toBeVisible();
  expect(
    screen.getAllByRole("link", { name: "spoticulum@ahmeto.com" }),
  ).toHaveLength(4);
});

test("opens the example with the keyboard and restores focus when closed", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  const example = await screen.findByRole("button", {
    name: "visual snapshot",
  });
  example.focus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("dialog", { name: "Example:" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: "Example:" }),
  ).not.toBeInTheDocument();
  await waitFor(() => expect(example).toHaveFocus());
  await user.keyboard(" ");
  expect(screen.getByRole("dialog", { name: "Example:" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Ok" }));
  expect(
    screen.queryByRole("dialog", { name: "Example:" }),
  ).not.toBeInTheDocument();
});

test("names footer icon controls and announces clipboard failure", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Ahmet Ömer on GitHub" }),
  ).toHaveAttribute("href", "https://github.com/ahmetomerv");
  expect(screen.getByRole("link", { name: "Ahmet Ömer on X" })).toHaveAttribute(
    "href",
    "https://x.com/ahmetdotme",
  );
  const copyEmail = screen.getByRole("button", { name: "Copy email address" });
  const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  copyEmail.focus();
  await user.keyboard("{Enter}");
  expect(writeText).toHaveBeenCalledWith("spoticulum@ahmeto.com");
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Could not copy. Email: spoticulum@ahmeto.com",
  );
  writeText.mockResolvedValue(undefined);
  await user.keyboard(" ");
  expect(writeText).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Email copied to clipboard.",
  );
});

test("shows loading then the signed-in choices from a valid profile", async () => {
  let releaseProfile: (response: Response) => void = () => {};
  const profileResponse = new Promise<Response>((resolve) => {
    releaseProfile = resolve;
  });
  const fetchMock = vi.fn(() => profileResponse);
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
  await act(async () => {
    releaseProfile(Response.json(signedInProfile));
    await profileResponse;
  });
  expect(
    await screen.findByRole("link", { name: "Test Listener" }),
  ).toHaveAttribute("href", signedInProfile.external_urls.spotify);
  expect(screen.getByRole("button", { name: "Artists" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Albums" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
  expect(document.title).toBe("Spoticulum of Test Listener");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("shows OAuth cancellation without requesting the profile", async () => {
  window.history.replaceState({}, "", "/?auth_error=access_denied");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(
      "Spotify authorization was cancelled. You can connect whenever you are ready.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Connect with Spotify" }),
  ).toHaveAttribute("href", "/api/login");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(window.location.search).toBe("");
});

test("a network error offers retry and can recover", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error("Network unavailable"))
    .mockResolvedValueOnce(Response.json(signedInProfile));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Network unavailable")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: "Artists" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("malformed successful profile data shows an error instead of crashing", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ id: "listener", display_name: "Listener" }),
    ),
  );
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("Invalid Spotify profile data."),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("a profile without a photo or external link remains usable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ id: "listener", display_name: null, images: [] }),
    ),
  );
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByText("listener")).toBeVisible();
  expect(screen.queryByRole("link", { name: "listener" })).toBeNull();
  expect(screen.getByRole("button", { name: "Artists" })).toBeVisible();
});

test("an unsafe profile URL is shown as text rather than a link", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...signedInProfile,
        external_urls: { spotify: "javascript:alert(1)" },
      }),
    ),
  );
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Test Listener")).toBeVisible();
  expect(screen.queryByRole("link", { name: "Test Listener" })).toBeNull();
});

test("a malformed profile image is rejected before Home renders it", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        id: "listener",
        display_name: "Listener",
        images: [{ url: 123 }],
      }),
    ),
  );
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("Invalid Spotify profile data."),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: "Artists" })).toBeNull();
});

test("leaving Home aborts a pending profile request and prevents a title update", async () => {
  let releaseProfile: (response: Response) => void = () => {};
  const profileResponse = new Promise<Response>((resolve) => {
    releaseProfile = resolve;
  });
  let requestSignal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: RequestInfo | URL, options?: RequestInit) => {
      requestSignal = options?.signal || undefined;
      return profileResponse;
    }),
  );
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
  await user.click(
    screen.getByRole("link", { name: "Terms of Service & Privacy Policy" }),
  );
  expect(requestSignal?.aborted).toBe(true);
  await act(async () => {
    releaseProfile(Response.json(signedInProfile));
    await profileResponse;
  });
  expect(
    screen.getByText(/Spoticulum is an independent service/),
  ).toBeVisible();
  expect(document.title).toBe("Spoticulum");
});
