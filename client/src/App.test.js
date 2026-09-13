import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import App from "./App";

test("preserves the login screen and legal navigation", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Login with Spotify" }),
  ).toBeVisible();
  await user.click(
    screen.getByRole("link", { name: "Terms of Service & Privacy Policy" }),
  );
  expect(
    screen.getByText(/Spoticulum is an independent service/),
  ).toBeVisible();
});

test("preserves the example modal and its close action", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  await user.click(screen.getByText("collection", { exact: true }));
  expect(screen.getByRole("dialog", { name: "Example:" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Ok" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
