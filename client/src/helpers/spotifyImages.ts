import type { SpotifyImage } from "../types/spotify";

function imageArea(image: SpotifyImage): number {
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  return width > 0 && height > 0 ? width * height : 0;
}

export function getBestSpotifyImageUrl(
  images: SpotifyImage[] | undefined,
  fallback = "",
): string {
  if (!images?.length) return fallback;

  const bestImage = images.reduce((best, image) =>
    imageArea(image) > imageArea(best) ? image : best,
  );

  return bestImage.url || fallback;
}
