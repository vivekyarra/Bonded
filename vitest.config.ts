import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    env: { QLOO_MODE: "fixture", ANTHROPIC_API_KEY: "" },
    testTimeout: 20000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
