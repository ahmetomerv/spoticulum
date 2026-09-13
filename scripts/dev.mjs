import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [
  {
    name: "server",
    cwd: new URL("../server/", import.meta.url),
    args: ["run", "dev"],
  },
  {
    name: "client",
    cwd: new URL("../client/", import.meta.url),
    args: ["start"],
  },
].map(({ name, cwd, args }) => {
  console.log(`[${name}] starting`);
  return spawn(npm, args, {
    cwd: fileURLToPath(cwd),
    env: process.env,
    stdio: "inherit",
  });
});

let stopping = false;
let exitCode = 0;

function stop(signal, code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of processes) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill(signal);
  }
}

process.on("SIGINT", () => stop("SIGINT", 130));
process.on("SIGTERM", () => stop("SIGTERM", 143));

await Promise.all(
  processes.map(
    (child) =>
      new Promise((resolve) => {
        child.once("error", (error) => {
          console.error(error.message);
          stop("SIGTERM", 1);
          resolve();
        });
        child.once("exit", (code) => {
          if (!stopping) stop("SIGTERM", code ?? 1);
          resolve();
        });
      }),
  ),
);

process.exitCode = exitCode;
