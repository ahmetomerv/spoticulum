import express from "express";

export function createAuthRoutes({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const router = express.Router();
  const request = async (url, options) => {
    const response = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Spotify returned ${response.status}`);
    return response.json();
  };

  router.get("/login", (_req, res) => {
    const query = new URLSearchParams({
      response_type: "code",
      client_id: env.CLIENT_ID,
      scope: "user-library-read user-top-read playlist-read-private",
      redirect_uri: env.REDIRECTURI,
    });
    res.redirect(`https://accounts.spotify.com/authorize?${query}`);
  });

  router.get("/logged", async (req, res) => {
    if (typeof req.query.code !== "string" || !req.query.code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }
    const data = await request("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: env.REDIRECTURI,
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
      }),
    });
    // Preserve the existing client callback contract. Session-based OAuth is
    // a separate migration because the domain components consume these fields.
    const redirect = new URL(env.CLIENT_REDIRECTURI);
    for (const [key, value] of Object.entries(data))
      redirect.searchParams.set(key, String(value));
    res.set("Cache-Control", "no-store");
    res.redirect(redirect.href);
  });

  router.get("/getUser/:token", async (req, res) => {
    const data = await request("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${req.params.token}` },
    });
    res.set("Cache-Control", "no-store");
    res.json(data);
  });
  return router;
}
