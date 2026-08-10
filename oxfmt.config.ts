import { defineConfig } from "oxfmt"
import ultracite from "ultracite/oxfmt"

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    // Payload regenerates the whole (payload) route group; formatting it
    // just creates churn the next `generate:importmap`/`payload generate`
    // run overwrites.
    "apps/payload/src/app/(payload)/**",
    "apps/payload/src/payload-types.ts",
    // Medusa owns committed migration history; its CLI output is immutable.
    "apps/medusa-be/src/modules/**/migrations/**",
    "apps/medusa-symmy-plugin/src/modules/**/migrations/**",
    "apps/payload/src/migrations/**",
    "**/.medusa/**",
    "**/__admin-extensions__.js",
    "libs/ui/src/tokens/figma/brand-overrides.css",
    "libs/ui/src/tokens/figma/variables.css",
    "libs/ui/src/tokens/_tokens-base.css",
  ],
  semi: false,
  trailingComma: "all",
})
