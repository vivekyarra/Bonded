import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    env: { QLOO_MODE: "fixture", GEMINI_API_KEY: "", GOOGLE_API_KEY: "" },
    testTimeout: 20000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
