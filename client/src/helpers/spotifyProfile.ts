import type { SpotifyImage, SpotifyProfile } from "../types/spotify";

function invalidProfile(): Error {
  return new Error("Invalid Spotify profile data.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDimension(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0)
    return value;
  throw invalidProfile();
}

function parseImage(value: unknown): SpotifyImage {
  if (!isRecord(value) || typeof value.url !== "string") throw invalidProfile();
  const width = parseDimension(value.width);
  const height = parseDimension(value.height);
  return {
    url: value.url.trim(),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
}

function parseSpotifyUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "open.spotify.com"
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function parseSpotifyProfile(value: unknown): SpotifyProfile {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    !(typeof value.display_name === "string" || value.display_name === null) ||
    !Array.isArray(value.images)
  )
    throw invalidProfile();

  const externalUrls = value.external_urls;
  const spotifyUrl = isRecord(externalUrls)
    ? parseSpotifyUrl(externalUrls.spotify)
    : undefined;

  return {
    id: value.id.trim(),
    display_name: value.display_name,
    images: value.images.map(parseImage),
    ...(spotifyUrl ? { external_urls: { spotify: spotifyUrl } } : {}),
  };
}
