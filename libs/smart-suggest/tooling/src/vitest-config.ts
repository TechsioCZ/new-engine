import { defineConfig } from "vitest/config"

type SmartSuggestPackage =
  | "client"
  | "core"
  | "datasets"
  | "indexing"
  | "integrations"
  | "react"
  | "storage"
  | "validation"

type SmartSuggestVitestOptions = {
  environment: "jsdom" | "node"
  include?: string[]
  packages?: SmartSuggestPackage[]
  reactSingletonFrom?: "ui"
}

const sourcePath = (relativePath: string) =>
  new URL(relativePath, import.meta.url).pathname

const packageSources: Record<SmartSuggestPackage, string> = {
  client: "../../client/src/index.ts",
  core: "../../core/src/index.ts",
  datasets: "../../datasets/src/index.ts",
  indexing: "../../indexing/src/index.ts",
  integrations: "../../integrations/src/index.ts",
  react: "../../react/src/index.ts",
  storage: "../../storage/src/index.ts",
  validation: "../../validation/src/index.ts",
}

const REACT_IMPORT_PATTERN = /^react$/u
const REACT_JSX_DEV_RUNTIME_PATTERN = /^react\/jsx-dev-runtime$/u
const REACT_JSX_RUNTIME_PATTERN = /^react\/jsx-runtime$/u

const packageAlias = (packageName: SmartSuggestPackage) => ({
  find: new RegExp(`^@techsio/smart-suggest-${packageName}$`, "u"),
  replacement: sourcePath(packageSources[packageName]),
})

const reactSingletonAliases = (packageName: "ui") => [
  {
    find: REACT_IMPORT_PATTERN,
    replacement: sourcePath(
      `../../${packageName}/node_modules/react/index.js`
    ),
  },
  {
    find: REACT_JSX_DEV_RUNTIME_PATTERN,
    replacement: sourcePath(
      `../../${packageName}/node_modules/react/jsx-dev-runtime.js`
    ),
  },
  {
    find: REACT_JSX_RUNTIME_PATTERN,
    replacement: sourcePath(
      `../../${packageName}/node_modules/react/jsx-runtime.js`
    ),
  },
]

export const defineSmartSuggestVitestConfig = ({
  environment,
  include = ["tests/**/*.test.ts"],
  packages = [],
  reactSingletonFrom,
}: SmartSuggestVitestOptions) =>
  defineConfig({
    resolve: {
      alias: [
        ...(reactSingletonFrom
          ? reactSingletonAliases(reactSingletonFrom)
          : []),
        ...packages.map(packageAlias),
      ],
      ...(reactSingletonFrom ? { dedupe: ["react", "react-dom"] } : {}),
    },
    test: {
      environment,
      include,
      passWithNoTests: true,
      restoreMocks: true,
      typecheck: { tsconfig: "../tsconfig.vitest.json" },
    },
  })
