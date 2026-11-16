import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "bun:test": "vitest" } },
  test: {
    // Keep the legacy Sidebar SSR contract in the normal gate without requiring Bun.
    include: [
      "tests/**/*.test.{ts,tsx}",
      "stories/pages/**/*.test.{ts,tsx}",
      "test/sidebar.ssr.bun.tsx",
    ],
  },
})
