import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "../src/createApp.js";

const env = {
  CLIENT_ID: "test-client",
  CLIENT_SECRET: "test-secret",
  REDIRECTURI: "http://127.0.0.1:8888/api/logged",
  CLIENT_REDIRECTURI: "http://127.0.0.1:3000/",
};

async function withServer(app, callback) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await callback(server);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("authorization redirect preserves the Spotify scopes and callback", async () => {
  const response = await withServer(createApp({ env }), (server) =>
    request(server).get("/api/login").expect(302),
  );
  const url = new URL(response.headers.location);
  assert.equal(url.origin, "https://accounts.spotify.com");
  assert.equal(url.searchParams.get("client_id"), env.CLIENT_ID);
  assert.equal(url.searchParams.get("redirect_uri"), env.REDIRECTURI);
  assert.equal(url.searchParams.get("scope"), "user-top-read");
  assert.ok(url.searchParams.get("state"));
  assert.match(response.headers["set-cookie"][0], /HttpOnly/);
  assert.match(response.headers["set-cookie"][0], /SameSite=Lax/);
});

test("production OAuth state cookies are secure", async () => {
  const response = await withServer(
    createApp({ env: { ...env, NODE_ENV: "production" } }),
    (server) => request(server).get("/api/login").expect(302),
  );
  assert.match(response.headers["set-cookie"][0], /; Secure/);
});

test("callback stores tokens server-side and redirects without exposing them", async () => {
  const token = {
    access_token: "a+b&c",
    refresh_token: "refresh",
    token_type: "Bearer",
    expires_in: 3600,
  };
  const profile = { id: "listener", display_name: "Listener" };
  const fetchImpl = async (url, options) => {
    if (url === "https://accounts.spotify.com/api/token") {
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("code"), "code+with&symbols");
      assert.equal(options.body.get("client_secret"), env.CLIENT_SECRET);
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json(token);
    }
    assert.equal(url, "https://api.spotify.com/v1/me");
    assert.equal(options.headers.Authorization, `Bearer ${token.access_token}`);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(profile);
  };
  await withServer(createApp({ env, fetchImpl }), async (server) => {
    const agent = request.agent(server);
    const login = await agent.get("/api/login").expect(302);
    const state = new URL(login.headers.location).searchParams.get("state");
    const response = await agent
      .get("/api/logged")
      .query({ code: "code+with&symbols", state })
      .expect(302);
    const url = new URL(response.headers.location);
    assert.equal(url.searchParams.get("auth"), "success");
    assert.equal(url.searchParams.get("access_token"), null);
    assert.equal(url.searchParams.get("refresh_token"), null);
    assert.match(
      response.headers["set-cookie"].join("\n"),
      /spoticulum_session=/,
    );
    assert.match(response.headers["set-cookie"].join("\n"), /HttpOnly/);
    assert.match(
      response.headers["set-cookie"].join("\n"),
      /spoticulum_oauth_state=;.*Max-Age=0/,
    );
    assert.equal(response.headers["cache-control"], "no-store");
    const me = await agent.get("/api/me").expect(200);
    assert.deepEqual(me.body, profile);
  });
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
    const state = new URL(login.headers.location).searchParams.get("state");
    const invalid = await agent
      .get("/api/logged")
      .query({ code: "abc", state: `${state}-tampered` })
      .expect(400);
    assert.match(
      invalid.headers["set-cookie"].join("\n"),
      /spoticulum_oauth_state=;.*Max-Age=0/,
    );
    await agent.get("/api/logged").query({ code: "abc", state }).expect(400);

    const deniedLogin = await agent.get("/api/login").expect(302);
    const deniedState = new URL(deniedLogin.headers.location).searchParams.get(
      "state",
    );
    const denied = await agent
      .get("/api/logged")
      .query({ error: "access_denied", state: deniedState })
      .expect("Location", "http://127.0.0.1:3000/?auth_error=access_denied")
      .expect(302);
    assert.match(
      denied.headers["set-cookie"].join("\n"),
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
      const validState = new URL(login.headers.location).searchParams.get(
        "state",
      );
      const response = await request(server)
        .get(`/api/logged?code=abc&state=${validState}`)
        .set("Cookie", login.headers["set-cookie"])
        .expect(expectedStatus);
      assert.deepEqual(response.body, { error: "Spotify request failed" });
    });
  }
});

test("top endpoint uses the server-side token and forwards safe query params", async () => {
  const fetchImpl = async (url, options) => {
    if (url === "https://accounts.spotify.com/api/token") {
      return Response.json({
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }
    const requestUrl = new URL(url);
    assert.equal(requestUrl.origin, "https://api.spotify.com");
    assert.equal(requestUrl.pathname, "/v1/me/top/artists");
    assert.equal(requestUrl.searchParams.get("time_range"), "long_term");
    assert.equal(requestUrl.searchParams.get("offset"), "50");
    assert.equal(requestUrl.searchParams.get("limit"), "50");
    assert.equal(options.headers.Authorization, "Bearer access-token");
    return Response.json({ items: [], next: null });
  };
  const response = await withServer(
    createApp({ env, fetchImpl }),
    async (server) => {
      const agent = request.agent(server);
      const login = await agent.get("/api/login").expect(302);
      const state = new URL(login.headers.location).searchParams.get("state");
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
      env: { ...env, NODE_ENV: "production" },
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
