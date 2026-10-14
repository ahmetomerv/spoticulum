import { render, screen, waitFor } from "@testing-library/react";
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
