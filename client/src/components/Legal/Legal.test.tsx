import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Legal from "./Legal";

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

test("a terms deep link focuses Terms of Service and keeps that section in the address", async () => {
  window.scrollTo = vi.fn();
  window.history.replaceState({}, "", "/legal#terms-of-service");
  render(<Legal />);

  const terms = screen.getByRole("heading", { name: /^Terms of Service$/ });
  await waitFor(() => expect(terms).toHaveFocus());
  expect(window.location.hash).toBe("#terms-of-service");
  expect(
    screen.getByRole("heading", { name: /^Privacy Policy$/ }),
  ).not.toHaveFocus();
});
