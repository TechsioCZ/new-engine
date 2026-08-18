import heurekaLogo from "@/assets/third-parties/heureka.avif"
import verifiedCustomerBadge from "@/assets/third-parties/overeny-zakaznik.avif"
import zboziLogo from "@/assets/third-parties/zbozi-seznam.avif"
import type {
  ReviewTrustProvider,
  ReviewTrustProviderSummary,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"

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
  summaries: readonly (ReviewTrustProviderSummary | null | undefined)[]
): readonly ReviewTrustSource[] =>
  summaries.flatMap((summary) => {
    if (!summary) {
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
