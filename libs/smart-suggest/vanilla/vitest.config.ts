import { defineConfig } from "vitest/config"

const sourcePath = (relativePath: string) =>
  new URL(relativePath, import.meta.url).pathname

const smartSuggestSourceAliases = [
  {
    find: /^@techsio\/smart-suggest-core$/u,
    replacement: sourcePath("../core/src/index.ts"),
  },
]

export default defineConfig({
  resolve: {
    alias: smartSuggestSourceAliases,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
    restoreMocks: true,
    typecheck: { tsconfig: "../tsconfig.vitest.json" },
  },
})
