import { defineConfig } from "oxlint"

export default defineConfig({
  categories: {
    correctness: "error",
  },
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/out/**",
    "**/.next/**",
    "**/.medusa/**",
    "**/__admin-extensions__.js",
    "**/coverage/**",
    "**/storybook-static/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "apps/payload/src/app/(payload)/importMap.js",
    "apps/payload/src/payload-types.ts",
  ],
  options: {
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  rules: {
    // Correctness is blocking by default. These rule-specific exceptions record
    // the pre-existing debt measured with Node 24 and Oxlint 1.74.0; remove each
    // exception when its cited diagnostics are repaired.
    "no-unused-vars": "off", // 19 diagnostics across 10 files.
    "typescript/await-thenable": "off", // 8 diagnostics across 5 files.
    "typescript/no-base-to-string": "off", // 30 diagnostics across 15 files.
    "typescript/no-duplicate-type-constituents": "off", // 47 diagnostics across 10 files.
    "typescript/no-floating-promises": "off", // 183 diagnostics across 68 files.
    "typescript/no-implied-eval": "off", // 1 diagnostic in 1 file.
    "typescript/no-misused-spread": "off", // 2 diagnostics across 2 files.
    "typescript/no-redundant-type-constituents": "off", // 39 diagnostics across 15 files.
    "typescript/no-useless-default-assignment": "off", // 8 diagnostics across 8 files.
    "typescript/require-array-sort-compare": "off", // 2 diagnostics across 2 files.
    "typescript/restrict-template-expressions": "off", // 18 diagnostics across 10 files.
    "typescript/unbound-method": "off", // 28 diagnostics across 4 files.
    "unicorn/no-new-array": "off", // 8 diagnostics across 2 files.
    "unicorn/no-useless-fallback-in-spread": "off", // 14 diagnostics across 13 files.

    "no-async-promise-executor": "error",
    "no-constant-binary-expression": "error",
    "no-debugger": "error",
    "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    "no-fallthrough": "error",
    "no-self-compare": "error",
    "no-template-curly-in-string": "error",
    "no-unreachable": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-negation": "error",
    "no-unsafe-optional-chaining": "error",
    "no-unused-private-class-members": "error",
    "oxc/const-comparisons": "error",
    "unicorn/no-useless-length-check": "error",
    "unicorn/no-useless-spread": "error",
  },
})
