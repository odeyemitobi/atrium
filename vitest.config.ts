import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@atrium/seed": fileURLToPath(new URL("./packages/seed/src/index.ts", import.meta.url)),
      "@atrium/sdk": fileURLToPath(new URL("./packages/sdk/src/index.ts", import.meta.url))
    }
  }
});
