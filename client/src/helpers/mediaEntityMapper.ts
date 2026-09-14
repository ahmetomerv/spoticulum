import type { MediaEntity, SpotifyTopItem } from "../types/spotify";

export default function mediaEntityMapper(entity: SpotifyTopItem): MediaEntity {
  const images = "images" in entity ? entity.images : entity.album.images;
  return {
    ...entity,
    images,
  };
}
