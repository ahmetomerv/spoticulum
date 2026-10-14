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

const spotifySizes = [
  { url: "small.jpeg", width: 64, height: 64 },
  { url: "medium.jpeg", width: 300, height: 300 },
  { url: "large.jpeg", width: 640, height: 640 },
];

test("selects the smallest image that covers a 70px cell", () => {
  expect(getBestSpotifyImageUrl(spotifySizes, "", 70)).toBe("medium.jpeg");
});

test("selects the smallest image that covers a 140px profile cell at 2x", () => {
  expect(getBestSpotifyImageUrl(spotifySizes, "", 280)).toBe("medium.jpeg");
});

test("keeps the 640px image when a 3x profile cell needs more than 300px", () => {
  expect(getBestSpotifyImageUrl(spotifySizes, "", 420)).toBe("large.jpeg");
});

test("falls back to the largest image when none cover the target", () => {
  expect(
    getBestSpotifyImageUrl(
      [
        { url: "small.jpeg", width: 64, height: 64 },
        { url: "medium.jpeg", width: 300, height: 300 },
      ],
      "",
      400,
    ),
  ).toBe("medium.jpeg");
});

test("keeps the first image when a target is set but dimensions are missing", () => {
  expect(
    getBestSpotifyImageUrl(
      [{ url: "first.jpeg" }, { url: "second.jpeg" }],
      "",
      140,
    ),
  ).toBe("first.jpeg");
});
