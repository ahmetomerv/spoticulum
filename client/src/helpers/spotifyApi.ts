interface SpotifyErrorBody {
  error?: string;
  retryAfter?: string;
  reason?: string;
}

export class SpotifyApiError extends Error {
  status: number;
  retryAfter?: string;
  reason?: string;

  constructor(message: string, status: number, body: SpotifyErrorBody) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.retryAfter = body.retryAfter;
    this.reason = body.reason;
  }
}

export async function spotifyApi<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) return null as T;

  const data = (await response.json().catch(() => ({}))) as SpotifyErrorBody;
  if (!response.ok) {
    throw new SpotifyApiError(
      data.error || "Spotify request failed",
      response.status,
      data,
    );
  }

  return data as T;
}
