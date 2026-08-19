import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const appRoot = fileURLToPath(new URL("../..", import.meta.url))

export default defineConfig({
  root: appRoot,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
      "@techsio/storefront-i18n": fileURLToPath(
        new URL("../../../../libs/storefront-i18n/src", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30_000,
    include: ["tests/url-registry/*.integration.ts"],
    maxWorkers: 1,
    sequence: { concurrent: false },
    testTimeout: 150_000,
  },
})
