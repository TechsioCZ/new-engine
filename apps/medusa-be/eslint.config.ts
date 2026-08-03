import { createRequire, registerHooks } from "node:module"
import { pathToFileURL } from "node:url"

import { defineConfig } from "eslint/config"

const projectRequire = createRequire(import.meta.url)
const typescriptUrl = pathToFileURL(projectRequire.resolve("typescript")).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "typescript") {
      return { shortCircuit: true, url: typescriptUrl }
    }

    return nextResolve(specifier, context)
  },
})

const { default: medusa } = await import("@medusajs/eslint-plugin")

export default defineConfig([
  {
    ignores: [
      "eslint.config.ts",
      "playwright.*.config.ts",
      "e2e-tests/**",
      "integration-tests/**",
      "tests/**",
      "src/**/migrations/**",
      "**/.medusa/**",
      "**/__admin-extensions__.js",
    ],
  },
  ...medusa.configs.strict,
  {
    files: [
      "e2e-tests/**/*.{js,jsx,ts,tsx}",
      "src/config/**/*.{js,jsx,ts,tsx}",
      "src/scripts/**/*.{js,jsx,ts,tsx}",
      "src/test-helpers/**/*.{js,jsx,ts,tsx}",
      "src/workflows/seed/**/*.{js,jsx,ts,tsx}",
      "src/**/medusa-config.ts",
      "src/**/migrations/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "@medusajs/use-medusa-error-not-generic-error": "off",
    },
  },
])
