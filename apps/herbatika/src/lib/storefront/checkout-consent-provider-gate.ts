import type { MarketCode } from "@/lib/market/market-runtime"
import { parseCheckoutConsentSnapshot } from "./checkout-consent"
import { isReviewTrustProviderSupported } from "./review-market-policy"

export type OptionalCheckoutProvider = "marketing" | "heureka"

export const isOptionalCheckoutProviderAllowed = ({
  market,
  now,
  provider,
  snapshot,
}: {
  market: MarketCode
  now?: Date
  provider: OptionalCheckoutProvider
  snapshot: unknown
}) => {
  const consent = parseCheckoutConsentSnapshot(snapshot, { market, now })
  if (!consent?.purposes[provider]) {
    return false
  }

  return (
    provider !== "heureka" || isReviewTrustProviderSupported(market, "heureka")
  )
}
