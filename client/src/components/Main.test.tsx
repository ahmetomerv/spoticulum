import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import Main from "./Main";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "Not authenticated" }, { status: 401 }),
    ),
  );
});

test("home renders without mounting the legal document", async () => {
  render(
    <MemoryRouter>
      <Main />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("link", { name: "Connect with Spotify" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Terms of Service" }),
  ).toBeNull();
  expect(screen.queryByRole("status", { name: "Loading page" })).toBeNull();
});

test("a direct legal URL shows the terms after the route loads", async () => {
  render(
    <MemoryRouter initialEntries={["/legal"]}>
      <Main />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("heading", { name: /^Terms of Service$/ }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: /^Privacy Policy$/ }),
  ).toBeVisible();
});

test("a direct collection URL loads the route and returns home when signed out", async () => {
  window.history.replaceState(
    {},
    "",
    "/collection?collection_request_type=artists",
  );
  render(
    <MemoryRouter
      initialEntries={["/collection?collection_request_type=artists"]}
    >
      <Main />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("link", { name: "Connect with Spotify" }),
  ).toBeVisible();
  expect(screen.queryByRole("status", { name: "Loading page" })).toBeNull();
  expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).toContain(
    "/api/me",
  );
});
