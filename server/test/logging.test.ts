import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/createApp.js";
import { createLogger, type LogEntry } from "../src/logger.js";
import type { SpotifySession } from "../src/routes/authRoutes.js";

const env = {
  CLIENT_ID: "test-client",
  CLIENT_SECRET: "test-client-secret",
  SESSION_SECRET: "test-session-secret-with-at-least-32-characters",
  REDIRECTURI: "http://127.0.0.1:8888/api/logged",
  CLIENT_REDIRECTURI: "http://127.0.0.1:3000/",
};

function captureLogs() {
  const lines: string[] = [];
  const logger = createLogger({ LOG_LEVEL: "info" }, (line) =>
    lines.push(line),
  );
  return {
    logger,
    entries: () => lines.map((line) => JSON.parse(line) as LogEntry),
    output: () => lines.join(""),
  };
}

test("logger writes structured JSON and respects its configured level", () => {
  const lines: string[] = [];
  const logger = createLogger({ LOG_LEVEL: "warn" }, (line) =>
    lines.push(line),
  );
  logger.log("info", "ignored");
  logger.log("warn", "rate_limited", { retryAfterSeconds: 12 });
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0] || "") as LogEntry;
  assert.equal(entry.level, "warn");
  assert.equal(entry.event, "rate_limited");
  assert.equal(entry.retryAfterSeconds, 12);
  assert.match(entry.timestamp, /^\d{4}-\d\d-\d\dT/);
});

test("API requests have correlated, sanitized completion logs without health noise", async () => {
  const captured = captureLogs();
  const app = createApp({ env, logger: captured.logger });
  const login = await request(app).get("/api/login").expect(302);
  await request(app).get("/health").expect(200);
  await request(app).get("/api/missing?code=private-code").expect(404);

  const entries = captured.entries();
  const started = entries.find((entry) => entry.event === "oauth_started");
  const completed = entries.find(
    (entry) =>
      entry.event === "http_request_completed" && entry.route === "/api/login",
  );
  assert.ok(started);
  assert.ok(completed);
  assert.equal(started.requestId, completed.requestId);
  assert.equal(login.headers["x-request-id"], completed.requestId);
  assert.equal(completed.statusCode, 302);
  assert.equal(typeof completed.durationMs, "number");
  assert.ok(
    entries.some(
      (entry) => entry.route === "/api/*" && entry.statusCode === 404,
    ),
  );
  assert.ok(!entries.some((entry) => entry.route === "/health"));
  assert.ok(!captured.output().includes("private-code"));
  assert.ok(!captured.output().includes("test-client-secret"));
});

test("OAuth, refresh, rate limit, and logout emit safe lifecycle events", async () => {
  const captured = captureLogs();
  const sessions = new Map<string, SpotifySession>();
  const app = createApp({
    env,
    logger: captured.logger,
    sessions,
    fetchImpl: async (input, options) => {
      const url = String(input);
      if (url === "https://accounts.spotify.com/api/token") {
        const body = options?.body;
        assert.ok(body instanceof URLSearchParams);
        if (body.get("grant_type") === "authorization_code") {
          return Response.json({
            access_token: "private-access-token",
            refresh_token: "private-refresh-token",
            expires_in: 1,
          });
        }
        return Response.json({
          access_token: "new-private-token",
          expires_in: 3600,
        });
      }
      return Response.json({ id: "private-profile-id" });
    },
  });
  const agent = request.agent(app);
  const login = await agent.get("/api/login").expect(302);
  const state = new URL(login.headers.location as string).searchParams.get(
    "state",
  );
  assert.ok(state);
  await agent
    .get("/api/logged")
    .query({ code: "private-code", state })
    .expect(302);
  await agent.get("/api/me").expect(200);
  const session = [...sessions.values()][0];
  assert.ok(session);
  session.spotifyRequestCount = 30;
  await agent.get("/api/me").expect(429);
  await agent.post("/api/logout").expect(204);

  const events = captured.entries().map((entry) => entry.event);
  for (const event of [
    "oauth_succeeded",
    "session_created",
    "token_refresh_succeeded",
    "local_rate_limited",
    "session_logged_out",
  ]) {
    assert.ok(events.includes(event), `Missing ${event}`);
  }
  for (const secret of [
    "private-code",
    "private-access-token",
    "private-refresh-token",
    "new-private-token",
    "private-profile-id",
    state,
  ]) {
    assert.ok(!captured.output().includes(secret), `Logged ${secret}`);
  }
});

test("rejected callbacks log a safe reason without callback query values", async () => {
  const captured = captureLogs();
  const agent = request.agent(createApp({ env, logger: captured.logger }));
  await agent.get("/api/login").expect(302);
  await agent
    .get("/api/logged")
    .query({ code: "private-callback-code", state: "private-wrong-state" })
    .expect(400);

  const rejection = captured
    .entries()
    .find((entry) => entry.event === "oauth_callback_rejected");
  assert.equal(rejection?.reason, "invalid_state");
  assert.ok(!captured.output().includes("private-callback-code"));
  assert.ok(!captured.output().includes("private-wrong-state"));
});

test("Spotify failures log status and fixed reason without provider response data", async () => {
  const captured = captureLogs();
  const app = createApp({
    env,
    logger: captured.logger,
    fetchImpl: async (input) => {
      if (String(input) === "https://accounts.spotify.com/api/token") {
        return Response.json({
          access_token: "private-access",
          refresh_token: "private-refresh",
        });
      }
      return Response.json(
        {
          error: {
            reason: "QUOTA_EXCEEDED",
            message: "private-provider-detail",
          },
        },
        { status: 429, headers: { "Retry-After": "12" } },
      );
    },
  });
  const agent = request.agent(app);
  const login = await agent.get("/api/login").expect(302);
  const state = new URL(login.headers.location as string).searchParams.get(
    "state",
  );
  assert.ok(state);
  await agent
    .get("/api/logged")
    .query({ code: "private-code", state })
    .expect(302);
  await agent.get("/api/me").expect(429);

  const failure = captured
    .entries()
    .find((entry) => entry.event === "spotify_request_failed");
  assert.equal(failure?.upstreamStatus, 429);
  assert.equal(failure?.statusCode, 429);
  assert.equal(failure?.reason, "quota_exceeded");
  for (const secret of [
    "private-access",
    "private-refresh",
    "private-provider-detail",
    "private-code",
    state,
  ]) {
    assert.ok(!captured.output().includes(secret), `Logged ${secret}`);
  }
});

test("failed OAuth token exchange has one safe failure event", async () => {
  const captured = captureLogs();
  const app = createApp({
    env,
    logger: captured.logger,
    fetchImpl: async () =>
      Response.json({ error: "private-provider-error" }, { status: 502 }),
  });
  const agent = request.agent(app);
  const login = await agent.get("/api/login").expect(302);
  const state = new URL(login.headers.location as string).searchParams.get(
    "state",
  );
  assert.ok(state);
  await agent
    .get("/api/logged")
    .query({ code: "private-code", state })
    .expect(502);

  const failures = captured
    .entries()
    .filter((entry) => entry.event === "oauth_token_exchange_failed");
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.upstreamStatus, 502);
  assert.ok(
    !captured
      .entries()
      .some((entry) => entry.event === "unhandled_request_error"),
  );
  for (const secret of ["private-provider-error", "private-code", state]) {
    assert.ok(!captured.output().includes(secret), `Logged ${secret}`);
  }
});
