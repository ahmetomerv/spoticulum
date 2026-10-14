import { afterEach, expect, test, vi } from "vitest";
import { spotifyApi } from "./spotifyApi";

afterEach(() => vi.unstubAllGlobals());

test("propagates cancellation while reading an API response body", async () => {
  const controller = new AbortController();
  const abortError = new DOMException("The request was aborted", "AbortError");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => {
        controller.abort();
        throw abortError;
      },
    })),
  );

  await expect(
    spotifyApi("/api/me", { signal: controller.signal }),
  ).rejects.toBe(abortError);
});
