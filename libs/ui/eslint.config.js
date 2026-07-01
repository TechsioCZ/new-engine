import path from "node:path"
import { fileURLToPath } from "node:url"
import tsParser from "@typescript-eslint/parser"
import tailwind from "eslint-plugin-tailwindcss"

const tokensCssAbsolutePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "src/tokens/index.css"
)

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      tailwindcss: {
        // For TailwindCSS v4 - point to CSS config file
        config: tokensCssAbsolutePath,
      },
    },
    plugins: {
      tailwindcss: tailwind,
    },
    rules: {
      // Only enable Tailwind CSS rules for class name validation
      "tailwindcss/classnames-order": "off",
      "tailwindcss/enforces-negative-arbitrary-values": "error",
      "tailwindcss/enforces-shorthand": "error",
      "tailwindcss/migration-from-tailwind-2": "off",
      "tailwindcss/no-arbitrary-value": "off",
      "tailwindcss/no-contradicting-classname": "error",
      // Tailwind v4 token utilities + tailwind-variants slot names cause false positives in this rule.
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/no-unnecessary-arbitrary-value": "error",
    },
  },
  {
    // Exclude generated/dist files from linting
    ignores: ["dist/**/*", "storybook-static/**/*"],
  },
]
