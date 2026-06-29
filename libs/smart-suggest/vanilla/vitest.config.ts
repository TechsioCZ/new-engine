import { fileURLToPath } from "node:url"

import { mergeConfig } from "vitest/config"

import { defineSmartSuggestVitestConfig } from "@techsio/smart-suggest-tooling/vitest-config"

const sourcePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url))

export default mergeConfig(
  defineSmartSuggestVitestConfig({
    environment: "jsdom",
    packages: ["core"],
  }),
  {
    resolve: {
      alias: [
        {
          find: /^@techsio\/smart-suggest-validation\/phone-lite$/u,
          replacement: sourcePath("../validation/src/phone-lite.ts"),
        },
        {
          find: /^@techsio\/smart-suggest-validation\/phone-strict$/u,
          replacement: sourcePath("../validation/src/phone-strict.ts"),
        },
      ],
    },
  }
)
