import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const appRoot = fileURLToPath(new URL("../..", import.meta.url))

export default defineConfig({
  root: appRoot,
  test: {
    environment: "node",
    include: ["tests/integration/ro-demo-commerce*.unit.spec.ts"],
    testTimeout: 120_000,
  },
})
