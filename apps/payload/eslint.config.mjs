import { createRequire, registerHooks } from "node:module"
import { pathToFileURL } from "node:url"

const projectRequire = createRequire(import.meta.url)
const typescriptUrl = pathToFileURL(
  projectRequire.resolve("typescript-eslint-compat"),
).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "typescript") {
      return { shortCircuit: true, url: typescriptUrl }
    }

    return nextResolve(specifier, context)
  },
})

const { default: nextVitals } =
  await import("eslint-config-next/core-web-vitals")
const { default: nextTypescript } =
  await import("eslint-config-next/typescript")

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^(_|ignore)",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: false,
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      ".next/",
      "src/migrations/[0-9]*.ts",
      "src/payload-types.ts",
      "src/app/(payload)/importMap.js",
    ],
  },
]

export default eslintConfig
