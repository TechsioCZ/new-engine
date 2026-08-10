import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import jsPlugins from "ultracite/oxlint/js-plugins"
import next from "ultracite/oxlint/next"
import nextJsPlugins from "ultracite/oxlint/next/js-plugins"
import react from "ultracite/oxlint/react"
import tanstack from "ultracite/oxlint/tanstack"
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins"
import vitest from "ultracite/oxlint/vitest"

const qualifiedRecordMessage =
  "Do not qualify Record to evade the unknown property bag guard."
const unknownPropertyBagMessage =
  "Do not use an unknown property bag. Define a domain shape, keep opaque data as object, or use the validated boundary's schema-owned type."

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
  rules: {
    "typescript/dot-notation": [
      "error",
      { allowIndexSignaturePropertyAccess: true },
    ],
    "typescript/no-restricted-types": [
      "error",
      {
        types: {
          JsonRecord:
            "Do not hide an unknown property bag behind JsonRecord. Define a schema-owned recursive JSON type or an exact domain shape.",
          "Map<string, ((unknown | never))>":
            "Do not disguise an unknown property bag with a parenthesized Map value union.",
          "Map<string, (unknown | never)>":
            "Do not disguise an unknown property bag with a parenthesized Map value union.",
          "Map<string, never | unknown>":
            "Do not replace an unknown property bag with a Map value union.",
          "Map<string, unknown | never>":
            "Do not replace an unknown property bag with a Map value union.",
          "Map<string, unknown>":
            "Do not replace an unknown property bag with a Map. Define exact key/value contracts.",
          "ReadonlyMap<PropertyKey, ((undefined | unknown))>":
            "Do not disguise an unknown property bag with a parenthesized ReadonlyMap value union.",
          "ReadonlyMap<PropertyKey, (undefined | unknown)>":
            "Do not disguise an unknown property bag with a parenthesized ReadonlyMap value union.",
          "ReadonlyMap<PropertyKey, undefined | unknown>":
            "Do not replace an unknown property bag with a ReadonlyMap value union.",
          "ReadonlyMap<string, unknown>":
            "Do not replace an unknown property bag with a ReadonlyMap. Define exact key/value contracts.",
          "Record<PropertyKey, unknown>": unknownPropertyBagMessage,
          "Record<keyof any, unknown>": unknownPropertyBagMessage,
          "Record<number, unknown>":
            "Do not use an unknown numeric property bag. Define a finite key domain and exact value type.",
          "Record<string, ((unknown | string))>": unknownPropertyBagMessage,
          "Record<string, (unknown | string)>": unknownPropertyBagMessage,
          "Record<string, string | unknown>": unknownPropertyBagMessage,
          "Record<string, unknown | string>": unknownPropertyBagMessage,
          "Record<string, unknown>": unknownPropertyBagMessage,
          "Record<symbol, unknown>":
            "Do not use an unknown symbol property bag. Define a finite key domain and exact value type.",
          UnknownObject:
            "Do not hide an unknown property bag behind UnknownObject. Define a domain shape or keep opaque data as object.",
          UnknownRecord:
            "Do not hide an unknown property bag behind UnknownRecord. Define a domain shape or keep opaque data as object.",
          "global.Record<PropertyKey, unknown>": qualifiedRecordMessage,
          "global.Record<string, unknown>": qualifiedRecordMessage,
          "globalThis.Record<PropertyKey, unknown>": qualifiedRecordMessage,
          "globalThis.Record<string, unknown>": qualifiedRecordMessage,
        },
      },
    ],
  },
})
