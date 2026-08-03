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
    ignores: ["eslint.config.ts", "src/**/migrations/**", ".medusa/**"],
  },
  ...medusa.configs.strict,
])
