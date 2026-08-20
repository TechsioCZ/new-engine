import heurekaLogo from "@/assets/third-parties/heureka.avif"
import verifiedCustomerBadge from "@/assets/third-parties/overeny-zakaznik.avif"
import zboziLogo from "@/assets/third-parties/zbozi-seznam.avif"
import type {
  ReviewTrustProvider,
  ReviewTrustProviderSummary,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"
import type { MarketCode } from "@/lib/market/market-runtime"
import { isReviewTrustProviderSupported } from "@/lib/storefront/review-market-policy"

const REVIEW_TRUST_SOURCE_BRANDING: Record<
  ReviewTrustProvider,
  Pick<ReviewTrustSource, "logo" | "logoAlt" | "logoWidth">
> = {
  heureka: {
    logo: heurekaLogo,
    logoAlt: "Heureka",
    logoWidth: 106,
  },
  zbozi: {
    logo: zboziLogo,
    logoAlt: "Zboží.cz",
    logoWidth: 105,
  },
}

export const createReviewTrustSources = (
  market: MarketCode,
  summaries: readonly (ReviewTrustProviderSummary | null | undefined)[]
): readonly ReviewTrustSource[] =>
  summaries.flatMap((summary) => {
    if (
      !(summary && isReviewTrustProviderSupported(market, summary.provider))
    ) {
      return []
    }

    return [
      {
        ...REVIEW_TRUST_SOURCE_BRANDING[summary.provider],
        id: summary.provider,
        reviewCountLabel: summary.reviewCountLabel,
        scoreLabel: summary.scoreLabel,
      },
    ]
  })

export const REVIEW_VERIFIED_CUSTOMER_BADGE = verifiedCustomerBadge
