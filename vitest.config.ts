import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Sandboxed CI runs are slow under parallel load; the default 5s timeout
    // produced false failures in webhook and bundle tests.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
