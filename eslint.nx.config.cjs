const nxPlugin = require("@nx/eslint-plugin")
const tsParser = require("@typescript-eslint/parser")

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.medusa/**",
      "**/playwright-report/**",
      "**/storybook-static/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/eslint.config.*",
      "apps/smart-suggest/apps/shell-super-app/src/modern-tanstack/**/router.gen.ts",
      "apps/payload/src/payload-types.ts",
      "apps/payload/src/app/(payload)/importMap.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@nx": nxPlugin,
    },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: false,
          allow: [],
          depConstraints: [
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: ["type:lib"],
            },
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: [
                "framework:next",
                "framework:react",
                "framework:medusa",
                "framework:agnostic",
              ],
            },
            {
              sourceTag: "type:lib",
              onlyDependOnLibsWithTags: ["type:lib"],
            },
            {
              sourceTag: "framework:next",
              onlyDependOnLibsWithTags: [
                "framework:next",
                "framework:react",
                "framework:agnostic",
              ],
            },
            {
              sourceTag: "framework:react",
              onlyDependOnLibsWithTags: [
                "framework:react",
                "framework:agnostic",
              ],
            },
            {
              sourceTag: "framework:medusa",
              onlyDependOnLibsWithTags: [
                "framework:medusa",
                "framework:agnostic",
              ],
            },
            {
              sourceTag: "platform:web",
              onlyDependOnLibsWithTags: ["platform:web", "platform:shared"],
            },
            {
              sourceTag: "platform:backend",
              onlyDependOnLibsWithTags: [
                "platform:backend",
                "platform:shared",
              ],
            },
            {
              sourceTag: "framework:agnostic",
              onlyDependOnLibsWithTags: ["framework:agnostic"],
            },
            {
              sourceTag: "platform:shared",
              onlyDependOnLibsWithTags: ["platform:shared"],
            },
          ],
        },
      ],
    },
  },
]
