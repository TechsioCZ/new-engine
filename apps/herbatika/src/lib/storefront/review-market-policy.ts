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

export const isProductReviewMarketSupported = (market: MarketCode) =>
  market === "sk"
