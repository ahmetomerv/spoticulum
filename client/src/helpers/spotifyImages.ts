import type { SpotifyImage } from "../types/spotify";

function imageArea(image: SpotifyImage): number {
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  return width > 0 && height > 0 ? width * height : 0;
}

function imageEdge(image: SpotifyImage): number {
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  return width > 0 && height > 0 ? Math.min(width, height) : 0;
}

export function getBestSpotifyImageUrl(
  images: SpotifyImage[] | undefined,
  fallback = "",
  targetEdge = 0,
): string {
  if (!images?.length) return fallback;

  if (targetEdge > 0) {
    const sufficient = images.filter(
      (image) => image.url && imageEdge(image) >= targetEdge,
    );
    if (sufficient.length) {
      const smallest = sufficient.reduce((best, image) =>
        imageEdge(image) < imageEdge(best) ? image : best,
      );
      return smallest.url || fallback;
    }
  }

  const bestImage = images.reduce((best, image) =>
    imageArea(image) > imageArea(best) ? image : best,
  );

  return bestImage.url || fallback;
}
