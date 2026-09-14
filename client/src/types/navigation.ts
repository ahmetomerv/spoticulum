import type { Location, NavigateFunction } from "react-router-dom";
import type { SpotifyProfile } from "./spotify";

export interface CollectionLocationState {
  user?: SpotifyProfile;
}

export interface RouterProps {
  navigate: NavigateFunction;
  location: Location<CollectionLocationState | null>;
}
