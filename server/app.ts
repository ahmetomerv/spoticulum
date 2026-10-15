import "dotenv/config";
import { createApp } from "./src/createApp.js";
import { createLogger } from "./src/logger.js";

const PORT = process.env.PORT || 8888;
const logger = createLogger(process.env);

try {
  const app = createApp({ logger });
  const server = app.listen(PORT, () => {
    logger.log("info", "server_started", { port: String(PORT) });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    logger.log("error", "server_start_failed", {
      code: error.code || "unknown",
    });
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      logger.log("info", "server_stopping", { signal });
      const forceClose = setTimeout(() => server.closeAllConnections(), 5000);
      server.close((error) => {
        clearTimeout(forceClose);
        if (error) {
          logger.log("error", "server_stop_failed");
          process.exitCode = 1;
        } else {
          logger.log("info", "server_stopped");
        }
      });
    });
  }
} catch {
  logger.log("error", "server_start_failed", { code: "initialization_failed" });
  process.exitCode = 1;
}
