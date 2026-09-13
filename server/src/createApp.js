import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { createAuthRoutes } from "./routes/authRoutes.js";

export function createApp({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sessions,
  clientBuild = fileURLToPath(new URL("../../client/build/", import.meta.url)),
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Preserve the existing cross-origin API contract during this migration.
  app.use("/api", cors(), createAuthRoutes({ env, fetchImpl, sessions }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  // Unknown API paths must not receive the SPA HTML fallback.
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  if (env.NODE_ENV === "production") {
    app.use(express.static(clientBuild));
    app.get(["/", "/collection", "/legal"], (_req, res) =>
      res.sendFile("index.html", { root: clientBuild }),
    );
  }
  app.use((error, _req, res, _next) => {
    const status = error.status || 502;
    res.status(status).json({
      error: status === 400 ? error.message : "Spotify request failed",
    });
  });
  return app;
}
