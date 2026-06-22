import "server-only"

import { REVIEW_TRUST_SOURCES } from "@/components/reviews/reviews.data"
import type {
  HomepageReviewsData,
  ReviewItem,
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

const resolveHeurekaTrustSources = (
  result: ExternalReviewsResult
): readonly ReviewTrustSource[] => {
  if (!result.ok) {
    return REVIEW_TRUST_SOURCES
  }

  return REVIEW_TRUST_SOURCES.map((source) =>
    source.id === "heureka"
      ? {
          ...source,
          scoreLabel: result.data.summary.scoreLabel,
          reviewCountLabel: result.data.summary.reviewCountLabel,
        }
      : source
  )
}

export const toHeurekaHomepageReviews = (
  result: ExternalReviewsResult
): HomepageReviewsData | null => {
  if (!result.ok) {
    return null
  }

  return {
    reviews: result.data.reviews.map(toReviewItem),
    trustSources: resolveHeurekaTrustSources(result),
  }
}

export async function fetchHeurekaExternalReviews(
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

export async function fetchHeurekaHomepageReviews(
  limit = 4
): Promise<HomepageReviewsData | null> {
  const result = await fetchHeurekaExternalReviews("shop", limit)

  return toHeurekaHomepageReviews(result)
}
