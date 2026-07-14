import "server-only"

import { loadMedusaStorefrontMessages } from "@techsio/storefront-i18n/medusa/messages"
import type { HerbatikaMarketContext } from "./market-context"
import { storefrontSdk } from "./sdk"

export const fetchStorefrontTextMessages = async (
  marketContext: HerbatikaMarketContext
) =>
  loadMedusaStorefrontMessages(storefrontSdk.client, {
    locale: marketContext.locale,
    market: marketContext.code,
  })
