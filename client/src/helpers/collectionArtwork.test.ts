import { expect, test } from "vitest";
import { createCollectionArtworkPicker } from "./collectionArtwork";

test("returns no picker when every entity has missing artwork", () => {
  expect(
    createCollectionArtworkPicker([
      { id: "one", label: "One", images: [] },
      { id: "two", label: "Two", images: [{ url: "" }] },
    ]),
  ).toBeNull();
});

test("keeps artwork order and reuses only usable images for missing cells", () => {
  const pick = createCollectionArtworkPicker(
    [
      { id: "one", label: "One", images: [{ url: "first.png" }] },
      { id: "two", label: "Two", images: [] },
      { id: "three", label: "Three", images: [{ url: "third.png" }] },
    ],
    () => 0,
  );

  expect(pick).not.toBeNull();
  expect(pick?.(0)).toBe("first.png");
  expect(pick?.(1)).toBe("first.png");
  expect(pick?.(2)).toBe("third.png");
  expect(pick?.(99)).toBe("first.png");
});
