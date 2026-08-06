import { vi, describe, expect, it } from "vitest"

import { createMedusaProductReviewService } from "../src/reviews/medusa-service"
import type { ReviewBase } from "../src/reviews/types"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createReview = (rating: number, index: number): ReviewBase => ({
  content: `Review ${index}`,
  id: `review_${index}`,
  rating,
  title: "Review",
})

const createReviewResponse = ({
  limit,
  offset = 0,
  ratings,
  totalCount = ratings.length,
}: {
  limit: number
  offset?: number
  ratings: number[]
  totalCount?: number
}) => ({
  count: totalCount,
  limit,
  offset,
  reviews: ratings.map(createReview),
  summary: {
    average_rating: 5,
    count: 1,
  },
})

const createSdkMock = () => {
  const sdk = createTestMedusaSdk()
  const fetch = vi.fn<(path: string, options?: unknown) => Promise<unknown>>()
  Object.defineProperty(sdk.client, "fetch", { value: fetch })
  return { fetch, sdk }
}

describe(createMedusaProductReviewService, () => {
  it("repairs inconsistent summary from a complete review response", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch.mockResolvedValueOnce(
      createReviewResponse({
        limit: 10,
        ratings: [5, 5, 5, 2, 5, 5, 5, 5, 5],
      }),
    )
    const service = createMedusaProductReviewService(sdk)

    const result = await service.listProductReviews({
      limit: 10,
      offset: 0,
      productId: "prod_1",
    })

    expect(fetch).toHaveBeenCalledOnce()
    expect(result.summary).toStrictEqual({
      average_rating: 4.7,
      count: 9,
    })
  })

  it("fetches a bounded full review set to repair paginated summary", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch
      .mockResolvedValueOnce(
        createReviewResponse({
          limit: 3,
          ratings: [5, 5, 5],
          totalCount: 9,
        }),
      )
      .mockResolvedValueOnce(
        createReviewResponse({
          limit: 9,
          ratings: [5, 5, 5, 2, 5, 5, 5, 5, 5],
        }),
      )
    const service = createMedusaProductReviewService(sdk)

    const result = await service.listProductReviews({
      limit: 3,
      offset: 0,
      productId: "prod_1",
    })

    expect(fetch).toHaveBeenNthCalledWith(1, "/store/products/prod_1/reviews", {
      query: {
        limit: 3,
        offset: 0,
      },
      signal: null,
    })
    expect(fetch).toHaveBeenNthCalledWith(2, "/store/products/prod_1/reviews", {
      query: {
        limit: 9,
        offset: 0,
      },
      signal: null,
    })
    expect(result.reviews).toHaveLength(3)
    expect(result.summary).toStrictEqual({
      average_rating: 4.7,
      count: 9,
    })
  })
})
