import { loadMedusaStorefrontMessages } from "@techsio/storefront-i18n/medusa/messages"
import { assertServerOnly } from "@/lib/server-guard"
import type { HerbatikaMarketContext } from "./market-context"
import { storefrontSdk } from "./sdk"

assertServerOnly("storefront/storefront-texts.server")

export const fetchStorefrontTextMessages = async (
  marketContext: HerbatikaMarketContext
) =>
  loadMedusaStorefrontMessages(storefrontSdk.client, {
    locale: marketContext.locale,
    market: marketContext.code,
  })
