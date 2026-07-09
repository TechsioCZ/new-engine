import "server-only"

import type { HerbatikaMarketContext } from "./market-context"
import { storefrontSdk } from "./sdk"
import type {
  StorefrontTextMessages,
  StorefrontTextsResponse,
} from "./storefront-texts"

const buildStorefrontTextsQuery = (marketContext: HerbatikaMarketContext) => ({
    locale: marketContext.locale,
    market: marketContext.code,
})

export const fetchStorefrontTextMessages = async (
  marketContext: HerbatikaMarketContext
): Promise<StorefrontTextMessages> => {
  const response = await storefrontSdk.client.fetch<StorefrontTextsResponse>(
    "/store/storefront-texts",
    {
      cache: "no-store",
      query: buildStorefrontTextsQuery(marketContext),
    }
  )

  return response.messages
}
