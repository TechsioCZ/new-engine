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
        // Tailwind CSS v4's compiler reads the CSS-first configuration here.
        cssConfigPath: tokensCssAbsolutePath,
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
      "tailwindcss/no-arbitrary-value": "off",
      "tailwindcss/no-contradicting-classname": "error",
      "tailwindcss/no-custom-classname": [
        "error",
        {
          whitelist: [
            "^text-color-select-(sm|md|lg)$",
            "^max-h-dialog-center-h-max$",
            "^aspect-product-card-image$",
            "^focus-visible:outline-steps-ring$",
            "^transition-footer-(title|link)$",
            "^max-w-header-max$",
            "^@max-header-desktop:(hidden|bg-header-bg)$",
            "^@header-desktop:hidden$",
            "^data-\\[position=start\\]:justify-items-start-safe$",
            "^duration-header$",
            "^force-reduced-motion$",
          ],
        },
      ],
      "tailwindcss/no-unnecessary-arbitrary-value": "error",
    },
  },
  {
    // Story fixtures intentionally demonstrate app-owned utility vocabularies
    // alongside the kit. The compiler-backed source checks above stay strict.
    files: ["stories/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "tailwindcss/no-custom-classname": "off",
    },
  },
  {
    // The theme remaps the spacing scale (h-50 is the --spacing-50 token, not
    // 200px), so these fixed demo dimensions must stay arbitrary values.
    files: [
      "stories/molecules/dialog.stories.tsx",
      "stories/organisms/table.stories.tsx",
    ],
    rules: {
      "tailwindcss/no-unnecessary-arbitrary-value": "off",
    },
  },
  {
    // These fixtures use custom size tokens and semantic spacing defaults.
    // Axis/side utilities preserve their values and cascade; shorthand does not.
    files: [
      "stories/atoms/image.stories.tsx",
      "stories/molecules/accordion.stories.tsx",
      "stories/molecules/select.stories.tsx",
      "stories/overview/color-palette.stories.tsx",
      "stories/organisms/footer.stories.tsx",
      "stories/organisms/header.stories.tsx",
    ],
    rules: {
      "tailwindcss/enforces-shorthand": "off",
    },
  },
  {
    // Exclude generated/dist files from linting
    ignores: ["dist/**/*", "storybook-static/**/*"],
  },
]
