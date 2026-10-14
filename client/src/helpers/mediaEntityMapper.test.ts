import { expect, test } from "vitest";
import { parseTopPage } from "./mediaEntityMapper";

test("normalizes artist names and images without retaining raw API fields", () => {
  expect(
    parseTopPage(
      {
        items: [
          {
            id: "artist-1",
            name: "An Artist",
            images: [{ url: "artist.png", width: 640, height: 640 }],
            popularity: 90,
          },
        ],
        next: null,
      },
      "artists",
    ),
  ).toEqual({
    items: [
      {
        id: "artist-1",
        label: "An Artist",
        images: [{ url: "artist.png", width: 640, height: 640 }],
      },
    ],
    next: null,
  });
});

test("labels track artwork with its album name", () => {
  expect(
    parseTopPage(
      {
        items: [
          {
            id: "track-1",
            name: "A Song",
            album: { name: "The Album", images: [{ url: "album.png" }] },
          },
        ],
        next: "https://api.spotify.com/v1/me/top/tracks?offset=50",
      },
      "tracks",
    ),
  ).toEqual({
    items: [
      {
        id: "track-1",
        label: "The Album",
        images: [{ url: "album.png" }],
      },
    ],
    next: "https://api.spotify.com/v1/me/top/tracks?offset=50",
  });
});

test("accepts a valid empty page and missing artwork arrays", () => {
  expect(parseTopPage({ items: [], next: null }, "artists")).toEqual({
    items: [],
    next: null,
  });
  expect(
    parseTopPage(
      {
        items: [{ id: "artist-1", name: "An Artist", images: [] }],
        next: null,
      },
      "artists",
    ).items[0]?.images,
  ).toEqual([]);
});

test.each([
  [{ items: {}, next: null }, "artists"],
  [{ items: [], next: "   " }, "artists"],
  [{ items: [{ id: "artist-1", images: [] }], next: null }, "artists"],
  [
    {
      items: [{ id: "artist-1", name: "An Artist", images: null }],
      next: null,
    },
    "artists",
  ],
  [{ items: [{ id: "track-1", album: { images: [] } }], next: null }, "tracks"],
  [
    {
      items: [{ id: "artist-1", name: "An Artist", images: [{ url: 42 }] }],
      next: null,
    },
    "artists",
  ],
] as const)("rejects malformed top-list data", (payload, type) => {
  expect(() => parseTopPage(payload, type)).toThrow(
    "Invalid Spotify collection data",
  );
});
