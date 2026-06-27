import { defineConfig } from "vitest/config";

const sourcePath = (relativePath: string) => new URL(relativePath, import.meta.url).pathname;

const smartSuggestSourceAliases = [
  {
    find: /^react$/u,
    replacement: sourcePath("node_modules/react/index.js"),
  },
  {
    find: /^react\/jsx-dev-runtime$/u,
    replacement: sourcePath("node_modules/react/jsx-dev-runtime.js"),
  },
  {
    find: /^react\/jsx-runtime$/u,
    replacement: sourcePath("node_modules/react/jsx-runtime.js"),
  },
  {
    find: /^@techsio\/smart-suggest-client$/u,
    replacement: sourcePath("../client/src/index.ts"),
  },
  {
    find: /^@techsio\/smart-suggest-core$/u,
    replacement: sourcePath("../core/src/index.ts"),
  },
  {
    find: /^@techsio\/smart-suggest-react$/u,
    replacement: sourcePath("../react/src/index.ts"),
  },
  {
    find: /^@techsio\/smart-suggest-validation$/u,
    replacement: sourcePath("../validation/src/index.ts"),
  },
];

export default defineConfig({
  resolve: {
    alias: smartSuggestSourceAliases,
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    passWithNoTests: true,
    restoreMocks: true,
    typecheck: { tsconfig: "../tsconfig.vitest.json" },
  },
});
