import medusa from "@medusajs/eslint-plugin"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    ignores: ["**/eslint.config.*", "**/playwright*.config.ts"],
  },
  ...medusa.configs.strict,
])
