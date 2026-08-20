import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}))

vi.mock("./market-sdk.server", () => ({
  getMarketStorefrontSdk: () => ({
    sdk: { client: { fetch: mocks.fetch } },
  }),
}))

import {
  type ExternalReviewsResult,
  fetchExternalReviewTrustSources,
  fetchHeurekaHomepageReviews,
  toHeurekaHomepageReviews,
} from "./external-reviews.server"

const createResult = (): Extract<ExternalReviewsResult, { ok: true }> => ({
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
      source: "heureka",
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
  beforeEach(() => {
    mocks.fetch.mockReset()
  })

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

  it("does not request or expose unsupported external reviews for RO", async () => {
    await expect(fetchExternalReviewTrustSources("ro")).resolves.toEqual([])
    await expect(fetchHeurekaHomepageReviews("ro")).resolves.toBeNull()

    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("preserves the Heureka and Zbozi reads for SK", async () => {
    mocks.fetch.mockImplementation((path: string) => {
      if (path.endsWith("/heureka")) {
        return Promise.resolve(createResult().data)
      }

      return Promise.resolve({
        provider: "zbozi",
        review_count: 42,
        score: 97,
        updated_at: "2026-08-19T10:00:00.000Z",
      })
    })

    const result = await fetchHeurekaHomepageReviews("sk")

    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    expect(result?.reviews).toHaveLength(1)
    expect(result?.trustSources.map(({ id }) => id)).toEqual([
      "heureka",
      "zbozi",
    ])
  })
})
