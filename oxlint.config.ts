import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import jsPlugins from "ultracite/oxlint/js-plugins"
import next from "ultracite/oxlint/next"
import nextJsPlugins from "ultracite/oxlint/next/js-plugins"
import react from "ultracite/oxlint/react"
import tanstack from "ultracite/oxlint/tanstack"
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins"
import vitest from "ultracite/oxlint/vitest"

export default defineConfig({
  extends: [
    core,
    react,
    next,
    tanstack,
    vitest,
    jsPlugins,
    nextJsPlugins,
    tanstackJsPlugins,
  ],
  ignorePatterns: [
    ...core.ignorePatterns,
    "**/.medusa/**",
    "**/__admin-extensions__.js",
    // Payload owns these generated import maps and types; its CLI overwrites them.
    "apps/payload/src/app/(payload)/importMap.js",
    "apps/payload/src/app/(payload)/admin/importMap/index.ts",
    "apps/payload/src/payload-types.ts",
    // Framework-owned migration history is generated and immutable.
    "apps/medusa-be/src/modules/**/migrations/**",
    "apps/medusa-symmy-plugin/src/modules/**/migrations/**",
    "apps/payload/src/migrations/**",
  ],
  options: {
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
})
