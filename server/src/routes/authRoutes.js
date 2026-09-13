import crypto from "node:crypto";
import express from "express";

const SESSION_COOKIE = "spoticulum_session";
const STATE_COOKIE = "spoticulum_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STATE_MAX_AGE_SECONDS = 60 * 10;
const MIN_TOKEN_TTL_MS = 60 * 1000;
const TOP_LIMIT = 50;

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...value] = cookie.split("=");
        return [name, decodeURIComponent(value.join("="))];
      }),
  );
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function signedValue(value, secret) {
  return `${value}.${sign(value, secret)}`;
}

function verifySignedValue(value, secret) {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const unsigned = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = sign(unsigned, secret);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  return unsigned;
}

function cookieHeader(name, value, { maxAge, secure, path = "/api" } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    `Path=${path}`,
  ];
  if (maxAge) parts.push(`Max-Age=${maxAge}`);
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookieHeader(name, { secure, path = "/api" } = {}) {
  return cookieHeader(name, "", { maxAge: 0, secure, path });
}

function appendSetCookie(res, header) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", header);
    return;
  }
  res.setHeader(
    "Set-Cookie",
    Array.isArray(existing) ? [...existing, header] : [existing, header],
  );
}

function tokenExpiresAt(data) {
  return Date.now() + Number(data.expires_in || 3600) * 1000;
}

export function createAuthRoutes({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sessions = new Map(),
} = {}) {
  const router = express.Router();
  const cookieSecret =
    env.SESSION_SECRET ||
    env.CLIENT_SECRET ||
    crypto.randomBytes(32).toString("base64url");
  const secureCookies =
    env.COOKIE_SECURE === "true" || env.NODE_ENV === "production";

  const spotifyRequest = async (url, options) => {
    const response = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    const retryAfter = response.headers.get("retry-after");
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      const error = new Error(`Spotify returned ${response.status}`);
      error.status = response.status;
      error.retryAfter = retryAfter;
      error.spotifyError = data;
      throw error;
    }
    return data;
  };

  const clientRedirect = (params = {}) => {
    const redirect = new URL(env.CLIENT_REDIRECTURI);
    for (const [key, value] of Object.entries(params)) {
      if (value) redirect.searchParams.set(key, value);
    }
    return redirect.href;
  };

  const readSignedCookie = (req, name) =>
    verifySignedValue(parseCookies(req.headers.cookie)[name], cookieSecret);

  const createSession = (tokenData) => {
    const sessionId = crypto.randomBytes(32).toString("base64url");
    sessions.set(sessionId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || "Bearer",
      scope: tokenData.scope || "",
      expiresAt: tokenExpiresAt(tokenData),
    });
    return sessionId;
  };

  const setSignedCookie = (res, name, value, maxAge) => {
    appendSetCookie(
      res,
      cookieHeader(name, signedValue(value, cookieSecret), {
        maxAge,
        secure: secureCookies,
      }),
    );
  };

  const clearAuthCookies = (res) => {
    appendSetCookie(
      res,
      clearCookieHeader(SESSION_COOKIE, { secure: secureCookies }),
    );
    appendSetCookie(
      res,
      clearCookieHeader(STATE_COOKIE, { secure: secureCookies }),
    );
  };

  const getSession = (req) => {
    const sessionId = readSignedCookie(req, SESSION_COOKIE);
    if (!sessionId) return null;
    const session = sessions.get(sessionId);
    if (!session) return null;
    return { sessionId, session };
  };

  const requireSession = (req, res) => {
    const stored = getSession(req);
    if (stored) return stored;
    res.status(401).json({ error: "Not authenticated" });
    return null;
  };

  const ensureAccessToken = async (session) => {
    if (session.expiresAt - Date.now() > MIN_TOKEN_TTL_MS) {
      return session.accessToken;
    }
    if (!session.refreshToken) {
      const error = new Error("Spotify session expired");
      error.status = 401;
      throw error;
    }
    const data = await spotifyRequest(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: session.refreshToken,
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
        }),
      },
    );
    session.accessToken = data.access_token;
    session.refreshToken = data.refresh_token || session.refreshToken;
    session.tokenType = data.token_type || session.tokenType;
    session.scope = data.scope || session.scope;
    session.expiresAt = tokenExpiresAt(data);
    return session.accessToken;
  };

  const sendSpotifyError = (res, error) => {
    const status = error.status || 502;
    if (status === 401) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Spotify authorization expired" });
    }
    if (status === 403) {
      return res.status(403).json({
        error:
          "Spotify refused this request. If the app is in development mode, make sure this Spotify account is allowlisted.",
      });
    }
    if (status === 429) {
      return res.status(429).json({
        error: "Spotify rate limit reached",
        retryAfter: error.retryAfter,
        reason: error.spotifyError?.error?.reason,
      });
    }
    return res.status(status >= 400 && status < 500 ? status : 502).json({
      error: "Spotify request failed",
    });
  };

  router.get("/login", (_req, res) => {
    const state = crypto.randomBytes(24).toString("base64url");
    setSignedCookie(res, STATE_COOKIE, state, STATE_MAX_AGE_SECONDS);
    const query = new URLSearchParams({
      response_type: "code",
      client_id: env.CLIENT_ID,
      scope: "user-top-read",
      redirect_uri: env.REDIRECTURI,
      state,
    });
    res.redirect(`https://accounts.spotify.com/authorize?${query}`);
  });

  router.get("/logged", async (req, res) => {
    if (typeof req.query.error === "string") {
      appendSetCookie(
        res,
        clearCookieHeader(STATE_COOKIE, { secure: secureCookies }),
      );
      return res.redirect(clientRedirect({ auth_error: req.query.error }));
    }
    const state = readSignedCookie(req, STATE_COOKIE);
    if (
      typeof req.query.code !== "string" ||
      !req.query.code ||
      typeof req.query.state !== "string" ||
      !state ||
      req.query.state !== state
    ) {
      clearAuthCookies(res);
      return res.status(400).json({ error: "Invalid Spotify callback" });
    }
    const data = await spotifyRequest(
      "https://accounts.spotify.com/api/token",
      {
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
      },
    );
    const sessionId = createSession(data);
    setSignedCookie(res, SESSION_COOKIE, sessionId, SESSION_MAX_AGE_SECONDS);
    appendSetCookie(
      res,
      clearCookieHeader(STATE_COOKIE, { secure: secureCookies }),
    );
    res.set("Cache-Control", "no-store");
    res.redirect(clientRedirect({ auth: "success" }));
  });

  router.get("/me", async (req, res) => {
    const stored = requireSession(req, res);
    if (!stored) return;
    try {
      const accessToken = await ensureAccessToken(stored.session);
      const data = await spotifyRequest("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      res.set("Cache-Control", "no-store");
      res.json(data);
    } catch (error) {
      sendSpotifyError(res, error);
    }
  });

  router.get("/top/:type", async (req, res) => {
    const stored = requireSession(req, res);
    if (!stored) return;
    if (!["artists", "tracks"].includes(req.params.type)) {
      return res.status(400).json({ error: "Invalid collection type" });
    }
    const offset = Number.parseInt(req.query.offset || "0", 10);
    if (!Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({ error: "Invalid offset" });
    }
    try {
      const accessToken = await ensureAccessToken(stored.session);
      const params = new URLSearchParams({
        time_range: "long_term",
        limit: String(TOP_LIMIT),
        offset: String(offset),
      });
      const data = await spotifyRequest(
        `https://api.spotify.com/v1/me/top/${req.params.type}?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      res.set("Cache-Control", "no-store");
      res.json(data);
    } catch (error) {
      sendSpotifyError(res, error);
    }
  });

  router.post("/logout", (req, res) => {
    const sessionId = readSignedCookie(req, SESSION_COOKIE);
    if (sessionId) sessions.delete(sessionId);
    clearAuthCookies(res);
    res.set("Cache-Control", "no-store");
    res.status(204).end();
  });

  return router;
}
