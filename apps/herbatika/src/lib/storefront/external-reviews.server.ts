// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import { cache } from "react"
import { createReviewTrustSources } from "@/components/reviews/reviews.data"
import type {
  HomepageReviewsData,
  ReviewItem,
  ReviewTrustProviderSummary,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"
import type { MarketCode } from "@/lib/market/market-runtime"
import { getMarketStorefrontSdk } from "./market-sdk.server"
import { isReviewTrustProviderSupported } from "./review-market-policy"

export type ExternalReviewKind = "shop" | "product"

export type ExternalReviewScores = {
  total?: number
  communication?: number
  deliveryTime?: number
  transportQuality?: number
  pickupTime?: number
  pickupQuality?: number
}

export type ExternalReview = {
  id: string
  source: "heureka"
  kind: ExternalReviewKind
  rating: number
  author: string
  message?: string
  createdAt: string
  verified: true
  recommended: boolean | null
  positivePoints?: string[]
  negativePoints?: string[]
  merchantReply?: {
    message: string
  }
  scores?: ExternalReviewScores
  product?: {
    name?: string
    url?: string
    ean?: string
  }
}

export type ExternalReviewSummary = {
  source: "heureka"
  scoreLabel: string
  reviewCountLabel: string
  calculatedFrom: "export"
  updatedAt: string
  recommendationRate: number | null
  recommendedCount: number
  recommendationSampleCount: number
  averageRating: number
  ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

export type ExternalReviewsResponse = {
  reviews: ExternalReview[]
  summary: ExternalReviewSummary
  meta: {
    kind: ExternalReviewKind
    exportCount: number
    textReviewCount: number
    generatedAt: string
    sourceUpdatedEveryHours: number
  }
}

export type ExternalReviewsResult =
  | {
      ok: true
      data: ExternalReviewsResponse
    }
  | {
      ok: false
      error: string
      kind: ExternalReviewKind
    }

export type ZboziReviewTrustSummaryResponse = {
  provider: "zbozi"
  review_count: number
  score: number
  updated_at: string
}

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("sk-SK", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export const formatExternalReviewDateLabel = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return ""
  }

  return REVIEW_DATE_FORMATTER.format(date)
}

const toReviewItem = (review: ExternalReview): ReviewItem => {
  const title = review.product?.name

  return {
    id: review.id,
    author: review.author,
    dateLabel: formatExternalReviewDateLabel(review.createdAt),
    ...(review.message === undefined ? {} : { message: review.message }),
    ...(review.merchantReply === undefined
      ? {}
      : { merchantReply: review.merchantReply }),
    ...(review.negativePoints === undefined
      ? {}
      : { negativePoints: review.negativePoints }),
    ...(review.positivePoints === undefined
      ? {}
      : { positivePoints: review.positivePoints }),
    rating: review.rating,
    recommended: review.recommended,
    ...(review.scores === undefined ? {} : { scores: review.scores }),
    ...(title === undefined ? {} : { title }),
    verifiedPurchase: review.verified,
  }
}

const toHeurekaTrustSummary = (
  result: ExternalReviewsResult | null
): ReviewTrustProviderSummary | null => {
  if (!result?.ok) {
    return null
  }

  return {
    provider: "heureka",
    reviewCountLabel: result.data.summary.reviewCountLabel,
    scoreLabel: result.data.summary.scoreLabel,
  }
}

export const toHeurekaHomepageReviews = (
  result: ExternalReviewsResult,
  trustSources: readonly ReviewTrustSource[]
): HomepageReviewsData | null => {
  if (!result.ok) {
    return null
  }

  return {
    reviews: result.data.reviews.map(toReviewItem),
    trustSources,
  }
}

async function fetchHeurekaExternalReviews(
  market: MarketCode,
  kind: ExternalReviewKind,
  limit = 4
): Promise<ExternalReviewsResult> {
  try {
    const { sdk } = getMarketStorefrontSdk(market)
    const data = await sdk.client.fetch<ExternalReviewsResponse>(
      "/store/external-reviews/heureka",
      {
        query: {
          kind,
          limit,
        },
      }
    )

    return {
      ok: true,
      data,
    }
  } catch (error) {
    return {
      ok: false,
      kind,
      error:
        error instanceof Error
          ? error.message
          : "Nepodarilo sa načítať externé recenzie.",
    }
  }
}

async function fetchZboziReviewTrustSummary(
  market: MarketCode
): Promise<ReviewTrustProviderSummary | null> {
  try {
    const { sdk } = getMarketStorefrontSdk(market)
    const data = await sdk.client.fetch<ZboziReviewTrustSummaryResponse>(
      "/store/external-reviews/zbozi"
    )

    return {
      provider: "zbozi",
      reviewCountLabel: `(${data.review_count}x)`,
      scoreLabel: `${data.score}%`,
    }
  } catch {
    return null
  }
}

const fetchExternalReviewResources = cache(
  async (market: MarketCode, heurekaLimit: number) => {
    const supportsHeureka = isReviewTrustProviderSupported(market, "heureka")
    const supportsZbozi = isReviewTrustProviderSupported(market, "zbozi")

    if (!(supportsHeureka || supportsZbozi)) {
      return { heurekaResult: null, trustSources: [] }
    }

    const [heurekaResult, zboziSummary] = await Promise.all([
      supportsHeureka
        ? fetchHeurekaExternalReviews(market, "shop", heurekaLimit)
        : Promise.resolve(null),
      supportsZbozi
        ? fetchZboziReviewTrustSummary(market)
        : Promise.resolve(null),
    ])
    const trustSources = createReviewTrustSources(market, [
      toHeurekaTrustSummary(heurekaResult),
      zboziSummary,
    ])

    return { heurekaResult, trustSources }
  }
)

export async function fetchExternalReviewTrustSources(
  market: MarketCode
): Promise<readonly ReviewTrustSource[]> {
  const { trustSources } = await fetchExternalReviewResources(market, 4)

  return trustSources
}

export async function fetchHeurekaHomepageReviews(
  market: MarketCode,
  limit = 4
): Promise<HomepageReviewsData | null> {
  const { heurekaResult, trustSources } = await fetchExternalReviewResources(
    market,
    limit
  )

  return heurekaResult
    ? toHeurekaHomepageReviews(heurekaResult, trustSources)
    : null
}
