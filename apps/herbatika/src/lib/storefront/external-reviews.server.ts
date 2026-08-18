import "server-only"

import { cache } from "react"
import { createReviewTrustSources } from "@/components/reviews/reviews.data"
import type {
  HomepageReviewsData,
  ReviewItem,
  ReviewTrustProviderSummary,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"
import { storefrontSdk } from "./sdk"

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

const toReviewItem = (review: ExternalReview): ReviewItem => ({
  id: review.id,
  author: review.author,
  dateLabel: formatExternalReviewDateLabel(review.createdAt),
  message: review.message,
  merchantReply: review.merchantReply,
  negativePoints: review.negativePoints,
  positivePoints: review.positivePoints,
  rating: review.rating,
  recommended: review.recommended,
  scores: review.scores,
  title: review.product?.name,
  verifiedPurchase: review.verified,
})

const toHeurekaTrustSummary = (
  result: ExternalReviewsResult
): ReviewTrustProviderSummary | null => {
  if (!result.ok) {
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
  kind: ExternalReviewKind,
  limit = 4
): Promise<ExternalReviewsResult> {
  try {
    const data = await storefrontSdk.client.fetch<ExternalReviewsResponse>(
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

async function fetchZboziReviewTrustSummary(): Promise<ReviewTrustProviderSummary | null> {
  try {
    const data =
      await storefrontSdk.client.fetch<ZboziReviewTrustSummaryResponse>(
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

const fetchExternalReviewResources = cache(async (heurekaLimit: number) => {
  const [heurekaResult, zboziSummary] = await Promise.all([
    fetchHeurekaExternalReviews("shop", heurekaLimit),
    fetchZboziReviewTrustSummary(),
  ])
  const trustSources = createReviewTrustSources([
    toHeurekaTrustSummary(heurekaResult),
    zboziSummary,
  ])

  return { heurekaResult, trustSources }
})

export async function fetchExternalReviewTrustSources(): Promise<
  readonly ReviewTrustSource[]
> {
  const { trustSources } = await fetchExternalReviewResources(4)

  return trustSources
}

export async function fetchHeurekaHomepageReviews(
  limit = 4
): Promise<HomepageReviewsData | null> {
  const { heurekaResult, trustSources } =
    await fetchExternalReviewResources(limit)

  return toHeurekaHomepageReviews(heurekaResult, trustSources)
}
