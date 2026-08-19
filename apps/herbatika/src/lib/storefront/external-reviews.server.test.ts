import { describe, expect, it } from "vitest"
import {
  type ExternalReviewsResult,
  toHeurekaHomepageReviews,
} from "./external-reviews.server"

const createResult = (): ExternalReviewsResult => ({
  ok: true,
  data: {
    reviews: [
      {
        id: "review-1",
        author: "Customer",
        createdAt: "2026-08-19T10:00:00.000Z",
        kind: "shop",
        rating: 5,
        recommended: null,
        source: "heureka",
        verified: true,
      },
    ],
    summary: {
      averageRating: 5,
      calculatedFrom: "export",
      ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
      recommendationRate: null,
      recommendationSampleCount: 0,
      recommendedCount: 0,
      reviewCountLabel: "(1x)",
      scoreLabel: "100%",
      updatedAt: "2026-08-19T10:00:00.000Z",
    },
    meta: {
      exportCount: 1,
      generatedAt: "2026-08-19T10:00:00.000Z",
      kind: "shop",
      sourceUpdatedEveryHours: 6,
      textReviewCount: 0,
    },
  },
})

describe("toHeurekaHomepageReviews", () => {
  it("omits undefined optional review properties from SSR data", () => {
    const result = toHeurekaHomepageReviews(createResult(), [])

    expect(result?.reviews[0]).toStrictEqual({
      id: "review-1",
      author: "Customer",
      dateLabel: "19. 08. 2026",
      rating: 5,
      recommended: null,
      verifiedPurchase: true,
    })
  })
})
