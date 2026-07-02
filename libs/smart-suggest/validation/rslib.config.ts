import { defineSmartSuggestRslibConfig } from "@techsio/smart-suggest-tooling/rslib-config"

export default defineSmartSuggestRslibConfig({
  configUrl: import.meta.url,
  entry: {
    effect: "./src/effect.ts",
    index: "./src/validation.ts",
    "packeta-strict": "./src/packeta-strict.ts",
    "phone-lite": "./src/phone-lite.ts",
    "phone-strict": "./src/phone-strict.ts",
    "phone-strict-effect": "./src/phone-strict-effect.ts",
    schemas: "./src/schemas.ts",
  },
})
