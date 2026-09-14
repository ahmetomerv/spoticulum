import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Expose only the existing public analytics setting, never all process.env.
  const env = loadEnv(mode, process.cwd(), ["REACT_APP_GA", "VITE_GA"]);
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "semantic-ui-react": fileURLToPath(
          new URL("./src/platform/semantic-ui.tsx", import.meta.url),
        ),
      },
    },
    define: {
      "process.env.REACT_APP_GA": JSON.stringify(
        env.VITE_GA || env.REACT_APP_GA || "",
      ),
    },
    build: {
      outDir: "build",
      target: ["chrome107", "edge107", "firefox104", "safari16"],
      // Semantic's already-minified CSS contains a legacy pseudo-selector
      // rejected by Lightning CSS. Keep the supplied stylesheet unchanged.
      cssMinify: false,
    },
    server: {
      proxy: {
        "/api": process.env.VITE_API_PROXY || "http://127.0.0.1:8888",
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/setupTests.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      clearMocks: true,
      restoreMocks: true,
    },
  };
});
