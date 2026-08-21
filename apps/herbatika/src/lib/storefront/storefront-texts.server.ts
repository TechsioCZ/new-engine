// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import { loadMedusaStorefrontMessages } from "@techsio/storefront-i18n/medusa/messages"
import type { HerbatikaMarketContext } from "./market-context"
import { getMarketStorefrontSdk } from "./market-sdk.server"
import { applyOperatorContactAuthority } from "./operator-contact-authority.server"

export const fetchStorefrontTextMessages = (
  marketContext: HerbatikaMarketContext
) => {
  const { sdk } = getMarketStorefrontSdk(marketContext.code)
  return loadMedusaStorefrontMessages(sdk.client, {
    locale: marketContext.locale,
    market: marketContext.code,
  }).then((messages) =>
    applyOperatorContactAuthority(marketContext.code, messages)
  )
}
