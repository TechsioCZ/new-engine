import type { ReviewTrustProvider } from "@/components/reviews/reviews.types"
import type { MarketCode } from "@/lib/market/market-runtime"

const REVIEW_TRUST_PROVIDER_MARKETS: Record<
  ReviewTrustProvider,
  readonly MarketCode[]
> = {
  heureka: ["sk"],
  zbozi: ["sk"],
}

export const isReviewTrustProviderSupported = (
  market: MarketCode,
  provider: ReviewTrustProvider
) => REVIEW_TRUST_PROVIDER_MARKETS[provider].includes(market)

// The product information section set is product-derived, so the reviews
// section is offered on every market. Third-party trust providers stay
// market-scoped above because their feeds are SK-only.
const PRODUCT_REVIEW_MARKETS: readonly MarketCode[] = ["sk", "cz", "hu", "ro"]

export const isProductReviewMarketSupported = (market: MarketCode) =>
  PRODUCT_REVIEW_MARKETS.includes(market)
