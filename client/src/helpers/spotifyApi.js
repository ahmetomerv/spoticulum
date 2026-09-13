export async function spotifyApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Spotify request failed');
    error.status = response.status;
    error.retryAfter = data.retryAfter;
    error.reason = data.reason;
    throw error;
  }

  return data;
}
