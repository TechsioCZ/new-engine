import { defineConfig } from "oxfmt"
import ultracite from "ultracite/oxfmt"

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    "apps/payload/src/app/(payload)/importMap.js",
    "apps/payload/src/payload-types.ts",
    "apps/medusa-be/src/modules/**/migrations/**",
    "apps/payload/src/migrations/**",
    "**/.medusa/**",
    "**/__admin-extensions__.js",
    "libs/ui/src/tokens/figma/brand-overrides.css",
    "libs/ui/src/tokens/figma/variables.css",
    "libs/ui/src/tokens/_tokens-base.css",
  ],
  semi: false,
})
