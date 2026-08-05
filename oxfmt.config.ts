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
    "apps/medusa-be/src/modules/**/migrations/**",
    "apps/payload/src/migrations/**",
    "**/.medusa/**",
    "**/__admin-extensions__.js",
    "libs/ui/src/tokens/figma/brand-overrides.css",
    "libs/ui/src/tokens/figma/variables.css",
    "libs/ui/src/tokens/_tokens-base.css",
    // Machine-generated debt ledger; kept as one compact line so baseline
    // regenerations do not produce ~90k-line diffs.
    "libs/ui/a11y-baseline.json",
  ],
  semi: false,
  trailingComma: "all",
})
