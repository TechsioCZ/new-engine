import { defineConfig } from "eslint/config"

import base from "../../eslint.config"

export default defineConfig([
  {
    extends: [base],
    rules: {},
  },
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
