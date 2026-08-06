import "server-only"

import { loadMedusaStorefrontMessages } from "@techsio/storefront-i18n/medusa/messages"
import type { HerbaticaMarketContext } from "./market-context"
import { storefrontSdk } from "./sdk"

export const fetchStorefrontTextMessages = async (
  marketContext: HerbaticaMarketContext
) =>
  loadMedusaStorefrontMessages(storefrontSdk.client, {
    locale: marketContext.locale,
    market: marketContext.code,
  })
