import { test } from "node:test";
import assert from "node:assert/strict";
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

test("authorization redirect preserves the Spotify scopes and callback", async () => {
  const response = await request(createApp({ env }))
    .get("/api/login")
    .expect(302);
  const url = new URL(response.headers.location);
  assert.equal(url.origin, "https://accounts.spotify.com");
  assert.equal(url.searchParams.get("client_id"), env.CLIENT_ID);
  assert.equal(url.searchParams.get("redirect_uri"), env.REDIRECTURI);
  assert.equal(
    url.searchParams.get("scope"),
    "user-library-read user-top-read playlist-read-private",
  );
});

test("native fetch exchanges the code and preserves the existing client callback fields", async () => {
  const token = {
    access_token: "a+b&c",
    refresh_token: "refresh",
    token_type: "Bearer",
    expires_in: 3600,
  };
  const fetchImpl = async (url, options) => {
    assert.equal(url, "https://accounts.spotify.com/api/token");
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("code"), "code+with&symbols");
    assert.equal(options.body.get("client_secret"), env.CLIENT_SECRET);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(token);
  };
  const response = await request(createApp({ env, fetchImpl }))
    .get("/api/logged")
    .query({ code: "code+with&symbols" })
    .expect(302);
  const url = new URL(response.headers.location);
  for (const [key, value] of Object.entries(token))
    assert.equal(url.searchParams.get(key), String(value));
  assert.equal(response.headers["cache-control"], "no-store");
});

test("malformed callback codes are rejected before calling Spotify", async () => {
  const app = createApp({
    env,
    fetchImpl: () => {
      throw new Error("must not be called");
    },
  });
  await request(app).get("/api/logged").expect(400);
  await request(app).get("/api/logged?code=a&code=b").expect(400);
  await request(app).get("/api/logged?error=access_denied").expect(400);
});

test("Express 5 handles network and upstream HTTP errors without leaking details", async () => {
  for (const fetchImpl of [
    async () => {
      throw new Error("secret network detail");
    },
    async () => Response.json({ error: "secret" }, { status: 401 }),
  ]) {
    const response = await request(createApp({ env, fetchImpl }))
      .get("/api/logged?code=abc")
      .expect(502);
    assert.deepEqual(response.body, { error: "Spotify request failed" });
  }
});

test("profile endpoint preserves its authorization header and response", async () => {
  const profile = { id: "listener", display_name: "Listener" };
  const fetchImpl = async (url, options) => {
    assert.equal(url, "https://api.spotify.com/v1/me");
    assert.equal(options.headers.Authorization, "Bearer access-token");
    return Response.json(profile);
  };
  const response = await request(createApp({ env, fetchImpl }))
    .get("/api/getUser/access-token")
    .expect(200);
  assert.deepEqual(response.body, profile);
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
    for (const route of ["/", "/collection", "/legal"]) {
      await request(app).get(route).expect("Content-Type", /html/).expect(200);
    }
    await request(app)
      .get("/asset.js")
      .expect("Content-Type", /javascript/)
      .expect(200);
    await request(app)
      .get("/api/missing")
      .expect("Content-Type", /json/)
      .expect(404);
    await request(app).get("/missing.js").expect(404);
    await request(app).get("/health").expect(200, { status: "ok" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
