import { readFile } from "node:fs/promises"
import { loadMedusaStorefrontMessages } from "@techsio/storefront-i18n/medusa/messages"
import { assertServerOnly } from "@/lib/server-guard"
import type { HerbatikaMarketContext } from "./market-context"
import { storefrontSdk } from "./sdk"

assertServerOnly("storefront/storefront-texts.server")

const flattenMessages = (
  value: unknown,
  prefix = "",
  result: Record<string, string> = {}
): Record<string, string> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error("Invalid storefront text fixture.")
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedKey = prefix ? `${prefix}.${key}` : key
    if (typeof nestedValue === "string") {
      result[nestedKey] = nestedValue
    } else {
      flattenMessages(nestedValue, nestedKey, result)
    }
  }
  return result
}

export const fetchStorefrontTextMessages = async (
  marketContext: HerbatikaMarketContext
) => {
  const fixturePath = process.env.STOREFRONT_TEXTS_FIXTURE_PATH?.trim()
  if (fixturePath) {
    return flattenMessages(JSON.parse(await readFile(fixturePath, "utf8")))
  }

  return loadMedusaStorefrontMessages(storefrontSdk.client, {
    locale: marketContext.locale,
    market: marketContext.code,
  })
}
