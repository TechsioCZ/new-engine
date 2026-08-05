import path from "node:path"
import { fileURLToPath } from "node:url"

import tsParser from "@typescript-eslint/parser"
import tailwind from "eslint-plugin-tailwindcss"

const tokensCssAbsolutePath = path.resolve(
  import.meta.dirname,
  "src/tokens/index.css",
)

export default [
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
      // Only enable Tailwind CSS rules for class name validation
      "tailwindcss/classnames-order": "off",
      "tailwindcss/enforces-negative-arbitrary-values": "error",
      "tailwindcss/enforces-shorthand": "error",
      "tailwindcss/migration-from-tailwind-2": "off",
      "tailwindcss/no-arbitrary-value": "off",
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
