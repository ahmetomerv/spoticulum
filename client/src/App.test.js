import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "Not authenticated" }, { status: 401 }),
    ),
  );
});

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
  expect(screen.getAllByText("13 September 2026")).toHaveLength(2);
  expect(
    screen.getByText(/access-token response fields are temporarily included/),
  ).toBeVisible();
  expect(
    screen.getAllByRole("link", { name: "spoticulum@ahmeto.com" }),
  ).toHaveLength(4);
});

test("preserves the example modal and its close action", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  await user.click(await screen.findByText("visual snapshot", { exact: true }));
  expect(screen.getByRole("dialog", { name: "Example:" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Ok" }));
  expect(
    screen.queryByRole("dialog", { name: "Example:" }),
  ).not.toBeInTheDocument();
});
