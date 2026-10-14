import type {
  CollectionPage,
  CollectionRequestType,
  MediaEntity,
  SpotifyImage,
} from "../types/spotify";

function invalidCollectionData(): Error {
  return new Error(
    "Invalid Spotify collection data. Return Home and try again.",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDimension(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0)
    return value;
  throw invalidCollectionData();
}

function parseImages(value: unknown): SpotifyImage[] {
  if (!Array.isArray(value)) throw invalidCollectionData();
  return value.map((image: unknown) => {
    if (!isRecord(image) || typeof image.url !== "string")
      throw invalidCollectionData();
    const width = parseDimension(image.width);
    const height = parseDimension(image.height);
    return {
      url: image.url.trim(),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    };
  });
}

function parseMediaEntity(
  value: unknown,
  type: CollectionRequestType,
): MediaEntity {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim())
    throw invalidCollectionData();

  const artworkOwner = type === "artists" ? value : value.album;
  if (
    !isRecord(artworkOwner) ||
    typeof artworkOwner.name !== "string" ||
    !artworkOwner.name.trim()
  )
    throw invalidCollectionData();

  return {
    id: value.id.trim(),
    // Track collections show album artwork, so their label is the album name.
    label: artworkOwner.name.trim(),
    images: parseImages(artworkOwner.images),
  };
}

export function parseTopPage(
  value: unknown,
  type: CollectionRequestType,
): CollectionPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !(
      value.next === null ||
      (typeof value.next === "string" && value.next.trim())
    )
  )
    throw invalidCollectionData();

  return {
    items: value.items.map((item: unknown) => parseMediaEntity(item, type)),
    next: typeof value.next === "string" ? value.next.trim() : null,
  };
}
