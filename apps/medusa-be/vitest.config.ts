import { defineConfig } from "vitest/config"

export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: "node",
    exclude: ["**/.medusa/**", "**/dist/**", "**/node_modules/**"],
    fileParallelism: false,
    globals: false,
    hookTimeout: 20_000,
    include: ["tests/unit/**/*.unit.spec.ts"],
    testTimeout: 20_000,
  },
})
