import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
      "@techsio/storefront-data": fileURLToPath(
        new URL("../../libs/storefront-data/src", import.meta.url),
      ),
    },
  },
})
