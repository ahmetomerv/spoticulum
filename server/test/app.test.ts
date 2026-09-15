import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import type { Express } from "express";
import type {
  FetchImplementation,
  SpotifySession,
} from "../src/routes/authRoutes.js";
import { createApp } from "../src/createApp.js";

const env = {
  CLIENT_ID: "test-client",
  CLIENT_SECRET: "test-secret",
  SESSION_SECRET: "test-session-secret-with-at-least-32-characters",
  REDIRECTURI: "http://127.0.0.1:8888/api/logged",
  CLIENT_REDIRECTURI: "http://127.0.0.1:3000/",
};
const productionEnv = {
  ...env,
  NODE_ENV: "production",
  REDIRECTURI: "https://spoticulum.ahmeto.com/api/logged",
  CLIENT_REDIRECTURI: "https://spoticulum.ahmeto.com",
};

test("production requires complete secure OAuth configuration", () => {
  assert.throws(
    () => createApp({ env: { NODE_ENV: "production" } }),
    /Missing required production environment variables/,
  );
  assert.throws(
    () =>
      createApp({
        env: {
          ...env,
          NODE_ENV: "production",
          REDIRECTURI: "http://spoticulum.ahmeto.com/api/logged",
          CLIENT_REDIRECTURI: "https://spoticulum.ahmeto.com",
        },
      }),
    /must use HTTPS/,
  );
});

test("API CORS only reflects configured app and local development origins", async () => {
  await withServer(createApp({ env: productionEnv }), async (server) => {
    const productionOrigin = await request(server)
      .get("/api/missing")
      .set("Origin", "https://spoticulum.ahmeto.com")
      .expect(404);
    assert.equal(
      productionOrigin.headers["access-control-allow-origin"],
      "https://spoticulum.ahmeto.com",
    );
    assert.equal(
      productionOrigin.headers["access-control-allow-credentials"],
      "true",
    );

    const localOrigin = await request(server)
      .get("/api/missing")
      .set("Origin", "http://127.0.0.1:3000")
      .expect(404);
    assert.equal(
      localOrigin.headers["access-control-allow-origin"],
      "http://127.0.0.1:3000",
    );

    const blockedOrigin = await request(server)
      .get("/api/missing")
      .set("Origin", "https://example.com")
      .expect(404);
    assert.equal(
      blockedOrigin.headers["access-control-allow-origin"],
      undefined,
    );
    assert.equal(
      blockedOrigin.headers["access-control-allow-credentials"],
      undefined,
    );

    const preflight = await request(server)
      .options("/api/me")
      .set("Origin", "https://spoticulum.ahmeto.com")
      .set("Access-Control-Request-Method", "GET")
      .expect(204);
    assert.equal(
      preflight.headers["access-control-allow-origin"],
      "https://spoticulum.ahmeto.com",
    );
  });
});

function requiredHeader(value: string | undefined, name: string): string {
  assert.ok(value, `Expected ${name} response header`);
  return value;
}

function setCookies(headers: Record<string, unknown>): string[] {
  const value = headers["set-cookie"];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  if (typeof value === "string") return [value];
  assert.fail("Expected set-cookie response header");
}

function formBody(options: RequestInit): URLSearchParams {
  assert.ok(options.body instanceof URLSearchParams);
  return options.body;
}

function authorizationHeader(options: RequestInit): string | null {
  return new Headers(options.headers).get("Authorization");
}

async function withServer<T>(
  app: Express,
  callback: (server: Server) => Promise<T> | T,
): Promise<T> {
  const server = createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  try {
    return await callback(server);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("authorization redirect preserves the Spotify scopes and callback", async () => {
  const response = await withServer(createApp({ env }), (server) =>
    request(server).get("/api/login").expect(302),
  );
  const url = new URL(requiredHeader(response.headers.location, "Location"));
  assert.equal(url.origin, "https://accounts.spotify.com");
  assert.equal(url.searchParams.get("client_id"), env.CLIENT_ID);
  assert.equal(url.searchParams.get("redirect_uri"), env.REDIRECTURI);
  assert.equal(url.searchParams.get("scope"), "user-top-read");
  assert.ok(url.searchParams.get("state"));
  assert.match(setCookies(response.headers)[0] || "", /HttpOnly/);
  assert.match(setCookies(response.headers)[0] || "", /SameSite=Lax/);
});

test("production OAuth state cookies are secure", async () => {
  const response = await withServer(
    createApp({ env: productionEnv }),
    (server) => request(server).get("/api/login").expect(302),
  );
  assert.match(setCookies(response.headers)[0] || "", /; Secure/);
});

test("callback stores tokens server-side and redirects without exposing them", async () => {
  const token = {
    access_token: "a+b&c",
    refresh_token: "refresh",
    token_type: "Bearer",
    expires_in: 3600,
  };
  const profile = { id: "listener", display_name: "Listener" };
  const fetchImpl: FetchImplementation = async (url, options = {}) => {
    if (url === "https://accounts.spotify.com/api/token") {
      assert.equal(options.method, "POST");
      assert.equal(formBody(options).get("code"), "code+with&symbols");
      assert.equal(formBody(options).get("client_secret"), env.CLIENT_SECRET);
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json(token);
    }
    assert.equal(url, "https://api.spotify.com/v1/me");
    assert.equal(authorizationHeader(options), `Bearer ${token.access_token}`);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(profile);
  };
  await withServer(createApp({ env, fetchImpl }), async (server) => {
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(
      requiredHeader(login.headers.location, "Location"),
    ).searchParams.get("state");
    const response = await agent
      .get("/api/logged")
      .query({ code: "code+with&symbols", state })
      .expect(302);
    const url = new URL(requiredHeader(response.headers.location, "Location"));
    assert.equal(url.searchParams.get("auth"), "success");
    assert.equal(url.searchParams.get("access_token"), null);
    assert.equal(url.searchParams.get("refresh_token"), null);
    assert.match(
      setCookies(response.headers).join("\n"),
      /spoticulum_session=/,
    );
    assert.match(setCookies(response.headers).join("\n"), /HttpOnly/);
    assert.match(
      setCookies(response.headers).join("\n"),
      /spoticulum_oauth_state=;.*Max-Age=0/,
    );
    assert.equal(response.headers["cache-control"], "no-store");
    const me = await agent.get("/api/me").expect(200);
    assert.deepEqual(me.body, profile);
  });
});

test("access tokens are refreshed server-side before they expire", async () => {
  let refreshCalls = 0;
  const fetchImpl: FetchImplementation = async (url, options = {}) => {
    if (url === "https://accounts.spotify.com/api/token") {
      if (formBody(options).get("grant_type") === "authorization_code") {
        return Response.json({
          access_token: "expiring-token",
          refresh_token: "refresh-token",
          token_type: "Bearer",
          expires_in: 30,
        });
      }
      refreshCalls += 1;
      assert.equal(formBody(options).get("grant_type"), "refresh_token");
      assert.equal(formBody(options).get("refresh_token"), "refresh-token");
      return Response.json({
        access_token: "refreshed-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    assert.equal(url, "https://api.spotify.com/v1/me");
    assert.equal(authorizationHeader(options), "Bearer refreshed-token");
    return Response.json({ id: "listener" });
  };
  await withServer(createApp({ env, fetchImpl }), async (server) => {
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(
      requiredHeader(login.headers.location, "Location"),
    ).searchParams.get("state");
    await agent.get("/api/logged").query({ code: "code", state }).expect(302);
    await agent.get("/api/me").expect(200, { id: "listener" });
  });
  assert.equal(refreshCalls, 1);
});

test("an unexpectedly rejected access token is refreshed and retried once", async () => {
  let profileCalls = 0;
  let refreshCalls = 0;
  const fetchImpl: FetchImplementation = async (url, options = {}) => {
    if (url === "https://accounts.spotify.com/api/token") {
      if (formBody(options).get("grant_type") === "authorization_code") {
        return Response.json({
          access_token: "rejected-token",
          refresh_token: "refresh-token",
          token_type: "Bearer",
          expires_in: 3600,
        });
      }
      refreshCalls += 1;
      return Response.json({
        access_token: "replacement-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    profileCalls += 1;
    if (profileCalls === 1) {
      assert.equal(authorizationHeader(options), "Bearer rejected-token");
      return Response.json({ error: "expired" }, { status: 401 });
    }
    assert.equal(authorizationHeader(options), "Bearer replacement-token");
    return Response.json({ id: "listener" });
  };
  await withServer(createApp({ env, fetchImpl }), async (server) => {
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(
      requiredHeader(login.headers.location, "Location"),
    ).searchParams.get("state");
    await agent.get("/api/logged").query({ code: "code", state }).expect(302);
    await agent.get("/api/me").expect(200, { id: "listener" });
  });
  assert.equal(profileCalls, 2);
  assert.equal(refreshCalls, 1);
});

test("an invalid refresh token destroys the server session", async () => {
  const sessions = new Map<string, SpotifySession>();
  const fetchImpl: FetchImplementation = async (url, options = {}) => {
    if (url === "https://accounts.spotify.com/api/token") {
      if (formBody(options).get("grant_type") === "authorization_code") {
        return Response.json({
          access_token: "expiring-token",
          refresh_token: "invalid-refresh-token",
          token_type: "Bearer",
          expires_in: 30,
        });
      }
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    throw new Error(`Unexpected request to ${url}`);
  };
  await withServer(createApp({ env, fetchImpl, sessions }), async (server) => {
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(
      requiredHeader(login.headers.location, "Location"),
    ).searchParams.get("state");
    await agent.get("/api/logged").query({ code: "code", state }).expect(302);
    assert.equal(sessions.size, 1);
    const response = await agent.get("/api/me").expect(401);
    assert.deepEqual(response.body, { error: "Spotify authorization expired" });
    assert.match(
      setCookies(response.headers).join("\n"),
      /spoticulum_session=;.*Max-Age=0/,
    );
    assert.equal(sessions.size, 0);
  });
});

test("expired sessions are removed server-side", async () => {
  const sessions = new Map<string, SpotifySession>();
  const fetchImpl: FetchImplementation = async (url) => {
    if (url === "https://accounts.spotify.com/api/token") {
      return Response.json({
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    throw new Error(`Unexpected request to ${url}`);
  };
  await withServer(createApp({ env, fetchImpl, sessions }), async (server) => {
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(
      requiredHeader(login.headers.location, "Location"),
    ).searchParams.get("state");
    await agent.get("/api/logged").query({ code: "code", state }).expect(302);
    const session = sessions.values().next().value;
    assert.ok(session);
    session.sessionExpiresAt = Date.now() - 1;
    await agent.get("/api/me").expect(401, { error: "Not authenticated" });
    assert.equal(sessions.size, 0);
  });
});

test("Spotify permission, quota, and rate-limit errors are actionable", async () => {
  const cases = [
    {
      status: 403,
      spotifyBody: { error: { status: 403, message: "Forbidden" } },
      expectedBody: {
        error:
          "Spotify refused this request. If the app is in development mode, make sure this Spotify account is allowlisted.",
      },
    },
    {
      status: 429,
      spotifyBody: {
        error: {
          status: 429,
          message: "Too many requests",
          reason: "QUOTA_EXCEEDED",
        },
      },
      retryAfter: "60",
      expectedBody: {
        error:
          "Spotify's development quota has been exceeded. Try again later or contact the app owner.",
        retryAfter: "60",
        reason: "QUOTA_EXCEEDED",
      },
    },
    {
      status: 429,
      spotifyBody: { error: { status: 429, message: "Too many requests" } },
      retryAfter: "12",
      expectedBody: {
        error: "Spotify rate limit reached. Try again in 12 seconds.",
        retryAfter: "12",
      },
    },
  ];

  for (const testCase of cases) {
    const fetchImpl: FetchImplementation = async (url) => {
      if (url === "https://accounts.spotify.com/api/token") {
        return Response.json({
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "Bearer",
          expires_in: 3600,
        });
      }
      return Response.json(testCase.spotifyBody, {
        status: testCase.status,
        headers: testCase.retryAfter
          ? { "Retry-After": testCase.retryAfter }
          : undefined,
      });
    };
    await withServer(createApp({ env, fetchImpl }), async (server) => {
      const agent = request.agent(server);
      const login = await agent.get("/api/login").expect(302);
      const state = new URL(
        requiredHeader(login.headers.location, "Location"),
      ).searchParams.get("state");
      await agent.get("/api/logged").query({ code: "code", state }).expect(302);
      const response = await agent
        .get("/api/top/artists")
        .expect(testCase.status);
      assert.deepEqual(response.body, testCase.expectedBody);
      if (testCase.retryAfter) {
        assert.equal(response.headers["retry-after"], testCase.retryAfter);
      }
    });
  }
});

test("callbacks require matching state and consume it before calling Spotify", async () => {
  const app = createApp({
    env,
    fetchImpl: () => {
      throw new Error("must not be called");
    },
  });
  await withServer(app, async (server) => {
    await request(server).get("/api/logged").expect(400);
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(
      requiredHeader(login.headers.location, "Location"),
    ).searchParams.get("state");
    const invalid = await agent
      .get("/api/logged")
      .query({ code: "abc", state: `${state}-tampered` })
      .expect(400);
    assert.match(
      setCookies(invalid.headers).join("\n"),
      /spoticulum_oauth_state=;.*Max-Age=0/,
    );
    await agent.get("/api/logged").query({ code: "abc", state }).expect(400);

    const deniedLogin = await agent.get("/api/login").expect(302);
    const deniedState = new URL(
      requiredHeader(deniedLogin.headers.location, "Location"),
    ).searchParams.get("state");
    const denied = await agent
      .get("/api/logged")
      .query({ error: "access_denied", state: deniedState })
      .expect("Location", "http://127.0.0.1:3000/?auth_error=access_denied")
      .expect(302);
    assert.match(
      setCookies(denied.headers).join("\n"),
      /spoticulum_oauth_state=;.*Max-Age=0/,
    );
  });
});

test("Express 5 handles network and upstream HTTP errors without leaking details", async () => {
  for (const { fetchImpl, expectedStatus } of [
    {
      fetchImpl: async () => {
        throw new Error("secret network detail");
      },
      expectedStatus: 502,
    },
    {
      fetchImpl: async () =>
        Response.json({ error: "secret" }, { status: 401 }),
      expectedStatus: 401,
    },
  ]) {
    const app = createApp({ env, fetchImpl });
    await withServer(app, async (server) => {
      const login = await request(server).get("/api/login").expect(302);
      const validState = new URL(
        requiredHeader(login.headers.location, "Location"),
      ).searchParams.get("state");
      const response = await request(server)
        .get(`/api/logged?code=abc&state=${validState}`)
        .set("Cookie", setCookies(login.headers))
        .expect(expectedStatus);
      assert.deepEqual(response.body, { error: "Spotify request failed" });
    });
  }
});

test("top endpoint uses the server-side token and forwards safe query params", async () => {
  const fetchImpl: FetchImplementation = async (url, options = {}) => {
    if (url === "https://accounts.spotify.com/api/token") {
      return Response.json({
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    const requestUrl = new URL(String(url));
    assert.equal(requestUrl.origin, "https://api.spotify.com");
    assert.equal(requestUrl.pathname, "/v1/me/top/artists");
    assert.equal(requestUrl.searchParams.get("time_range"), "long_term");
    assert.equal(requestUrl.searchParams.get("offset"), "50");
    assert.equal(requestUrl.searchParams.get("limit"), "50");
    assert.equal(authorizationHeader(options), "Bearer access-token");
    return Response.json({ items: [], next: null });
  };
  const response = await withServer(
    createApp({ env, fetchImpl }),
    async (server) => {
      const agent = request.agent(server);
      const login = await agent.get("/api/login").expect(302);
      const state = new URL(
        requiredHeader(login.headers.location, "Location"),
      ).searchParams.get("state");
      await agent.get("/api/logged").query({ code: "code", state }).expect(302);
      return agent
        .get("/api/top/artists?time_range=long_term&offset=50&limit=50")
        .expect(200);
    },
  );
  assert.deepEqual(response.body, { items: [], next: null });
});

test("production serves assets and every SPA route independently of cwd, with API 404s", async () => {
  const dir = await mkdtemp(join(tmpdir(), "spoticulum-static-test-"));
  try {
    await writeFile(
      join(dir, "index.html"),
      '<!doctype html><div id="root"></div>',
    );
    await writeFile(join(dir, "asset.js"), 'console.log("asset")');
    const app = createApp({
      env: productionEnv,
      clientBuild: dir,
    });
    await withServer(app, async (server) => {
      for (const route of ["/", "/collection", "/legal"]) {
        await request(server)
          .get(route)
          .expect("Content-Type", /html/)
          .expect(200);
      }
      await request(server)
        .get("/asset.js")
        .expect("Content-Type", /javascript/)
        .expect(200);
      await request(server)
        .get("/api/missing")
        .expect("Content-Type", /json/)
        .expect(404);
      await request(server).get("/missing.js").expect(404);
      await request(server).get("/health").expect(200, { status: "ok" });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
