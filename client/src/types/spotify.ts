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

export interface SpotifyArtist {
  id: string;
  images: SpotifyImage[];
  name?: string;
}

export interface SpotifyAlbum {
  images: SpotifyImage[];
  name?: string;
}

export interface SpotifyTrack {
  id: string;
  album: SpotifyAlbum;
  name?: string;
}

export type SpotifyTopItem = SpotifyArtist | SpotifyTrack;

export interface SpotifyTopResponse<T extends SpotifyTopItem = SpotifyTopItem> {
  items: T[];
  next: string | null;
  offset?: number;
}

export interface MediaEntity {
  id: string;
  images: SpotifyImage[];
  name?: string;
}

export type CollectionRequestType = "artists" | "tracks";
export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";
