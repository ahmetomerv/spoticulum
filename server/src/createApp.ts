import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";
import {
  createAuthRoutes,
  type Environment,
  type FetchImplementation,
  type SessionStore,
} from "./routes/authRoutes.js";

interface CreateAppOptions {
  env?: Environment;
  fetchImpl?: FetchImplementation;
  sessions?: SessionStore;
  clientBuild?: string;
}

interface HttpError extends Error {
  status?: number;
}

function defaultClientBuild(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot =
    basename(dirname(moduleDirectory)) === "dist"
      ? resolve(moduleDirectory, "../../..")
      : resolve(moduleDirectory, "../..");
  return resolve(projectRoot, "client/build");
}

export function createApp({
  env = process.env,
  fetchImpl = globalThis.fetch,
  sessions,
  clientBuild = defaultClientBuild(),
}: CreateAppOptions = {}): Express {
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
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    _next,
  ) => {
    const httpError = error instanceof Error ? (error as HttpError) : null;
    const status = httpError?.status || 502;
    res.status(status).json({
      error: status === 400 ? httpError?.message : "Spotify request failed",
    });
  };
  app.use(errorHandler);
  return app;
}
