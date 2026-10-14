import type { MediaEntity } from "../types/spotify";
import { getBestSpotifyImageUrl } from "./spotifyImages";

export function createCollectionArtworkPicker(
  mediaEntities: MediaEntity[],
  random: () => number = Math.random,
  targetEdge = 0,
): ((index: number) => string) | null {
  const urls = mediaEntities.map((entity) =>
    getBestSpotifyImageUrl(
      entity.images?.filter((image) => image.url?.trim()),
      "",
      targetEdge,
    ),
  );
  const usableUrls = urls.filter(Boolean);
  const firstUsableUrl = usableUrls[0];
  if (!firstUsableUrl) return null;

  return (index) =>
    urls[index] ||
    usableUrls[Math.floor(random() * usableUrls.length)] ||
    firstUsableUrl;
}
