import { expect, test } from "vitest";
import { createCollectionArtworkPicker } from "./collectionArtwork";

test("returns no picker when every entity has missing artwork", () => {
  expect(
    createCollectionArtworkPicker([
      { id: "one", images: [] },
      { id: "two", images: [{ url: "" }] },
    ]),
  ).toBeNull();
});

test("keeps artwork order and reuses only usable images for missing cells", () => {
  const pick = createCollectionArtworkPicker(
    [
      { id: "one", images: [{ url: "first.png" }] },
      { id: "two", images: [] },
      { id: "three", images: [{ url: "third.png" }] },
    ],
    () => 0,
  );

  expect(pick).not.toBeNull();
  expect(pick?.(0)).toBe("first.png");
  expect(pick?.(1)).toBe("first.png");
  expect(pick?.(2)).toBe("third.png");
  expect(pick?.(99)).toBe("first.png");
});
