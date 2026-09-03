import { fileURLToPath } from "node:url"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/four-market-e2e/**"],
    env: {
      ALLOWED_MARKETS: "sk,cz,hu,ro",
      MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
      MARKET_ACCEPTED_HOSTS_HU: "herbatica.hu",
      MARKET_ACCEPTED_HOSTS_RO: "herbatica.ro",
      MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@techsio/storefront-data": fileURLToPath(
        new URL("../../libs/storefront-data/src", import.meta.url)
      ),
      "@techsio/storefront-i18n": fileURLToPath(
        new URL("../../libs/storefront-i18n/src", import.meta.url)
      ),
    },
  },
})
