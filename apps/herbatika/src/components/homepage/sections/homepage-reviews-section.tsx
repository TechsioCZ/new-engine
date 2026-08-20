import type { HomepageReviewsData } from "@/components/reviews/reviews.types"
import { ReviewsSection } from "@/components/reviews/reviews-section"
import type { MarketCode } from "@/lib/market/market-runtime"
import { isReviewTrustProviderSupported } from "@/lib/storefront/review-market-policy"

type HomepageReviewsSectionProps = {
  market: MarketCode
  reviewsData?: HomepageReviewsData | null
}

export function HomepageReviewsSection({
  market,
  reviewsData,
}: HomepageReviewsSectionProps) {
  if (
    !(isReviewTrustProviderSupported(market, "heureka") && reviewsData) ||
    reviewsData.reviews.length === 0
  ) {
    return null
  }

  return (
    <ReviewsSection
      reviews={reviewsData.reviews}
      scoreLabel={null}
      sectionClassName="space-y-500"
      trustSources={reviewsData.trustSources}
      variant="homepage"
    />
  )
}
