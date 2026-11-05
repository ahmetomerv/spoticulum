import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "semantic-ui-react": fileURLToPath(
          new URL("./src/platform/semantic-ui.tsx", import.meta.url),
        ),
      },
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
