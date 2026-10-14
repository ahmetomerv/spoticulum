export interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

export interface SpotifyExternalUrls {
  spotify?: string;
}

export interface SpotifyProfile {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
  external_urls?: SpotifyExternalUrls;
}

export interface MediaEntity {
  id: string;
  label: string;
  images: SpotifyImage[];
}

export interface CollectionPage {
  items: MediaEntity[];
  next: string | null;
}

export type CollectionRequestType = "artists" | "tracks";
export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";
