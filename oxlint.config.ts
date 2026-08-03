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
    // Committed migration history is generated and immutable.
    "apps/payload/src/migrations/**",
  ],
  options: {
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  rules: {
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
