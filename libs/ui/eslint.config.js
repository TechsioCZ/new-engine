import path from "node:path"

import tsParser from "@typescript-eslint/parser"
import tailwind from "eslint-plugin-tailwindcss"

const tokensCssAbsolutePath = path.resolve(
  import.meta.dirname,
  "src/tokens/index.css",
)

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      tailwindcss: tailwind,
    },
    rules: {
      // The plugin's Tailwind 4-compatible validation rules complement the
      // token-specific validators in scripts/validate-token-*.js.
      "tailwindcss/classnames-order": "error",
      "tailwindcss/enforces-negative-arbitrary-values": "error",
      "tailwindcss/enforces-shorthand": "error",
      "tailwindcss/no-arbitrary-value": "error",
      "tailwindcss/no-contradicting-classname": "error",
      "tailwindcss/no-custom-classname": "error",
      "tailwindcss/no-unnecessary-arbitrary-value": "error",
    },
    settings: {
      tailwindcss: {
        // For TailwindCSS v4 - point to CSS config file
        cssConfigPath: tokensCssAbsolutePath,
      },
    },
  },
  {
    // Exclude generated/dist files from linting
    ignores: ["dist/**/*", "storybook-static/**/*"],
  },
]

export default config
