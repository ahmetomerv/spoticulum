import { expect, test } from "vitest";
import { getBestSpotifyImageUrl } from "./spotifyImages";

test("selects the largest Spotify image by dimensions", () => {
  expect(
    getBestSpotifyImageUrl([
      { url: "small.jpeg", width: 64, height: 64 },
      { url: "large.jpeg", width: 640, height: 640 },
      { url: "medium.jpeg", width: 300, height: 300 },
    ]),
  ).toBe("large.jpeg");
});

test("keeps Spotify's first image when dimensions are unavailable", () => {
  expect(
    getBestSpotifyImageUrl([{ url: "first.jpeg" }, { url: "second.jpeg" }]),
  ).toBe("first.jpeg");
});

test("returns a fallback when no image is available", () => {
  expect(getBestSpotifyImageUrl([], "spoticulum-logo.png")).toBe(
    "spoticulum-logo.png",
  );
});
