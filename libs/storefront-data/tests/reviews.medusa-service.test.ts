import type Medusa from "@medusajs/js-sdk"
import { createMedusaProductReviewService } from "../src/reviews/medusa-service"
import type { ReviewBase } from "../src/reviews/types"

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
  const fetch = vi.fn()

  return {
    fetch,
    sdk: {
      client: {
        fetch,
      },
    } as unknown as Medusa,
  }
}

describe("createMedusaProductReviewService", () => {
  it("repairs inconsistent summary from a complete review response", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch.mockResolvedValueOnce(
      createReviewResponse({
        limit: 10,
        ratings: [5, 5, 5, 2, 5, 5, 5, 5, 5],
      })
    )
    const service = createMedusaProductReviewService(sdk)

    const result = await service.listProductReviews({
      productId: "prod_1",
      limit: 10,
      offset: 0,
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.summary).toEqual({
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
        })
      )
      .mockResolvedValueOnce(
        createReviewResponse({
          limit: 9,
          ratings: [5, 5, 5, 2, 5, 5, 5, 5, 5],
        })
      )
    const service = createMedusaProductReviewService(sdk)

    const result = await service.listProductReviews({
      productId: "prod_1",
      limit: 3,
      offset: 0,
    })

    expect(fetch).toHaveBeenNthCalledWith(1, "/store/products/prod_1/reviews", {
      query: {
        limit: 3,
        offset: 0,
      },
      signal: undefined,
    })
    expect(fetch).toHaveBeenNthCalledWith(2, "/store/products/prod_1/reviews", {
      query: {
        limit: 9,
        offset: 0,
      },
      signal: undefined,
    })
    expect(result.reviews).toHaveLength(3)
    expect(result.summary).toEqual({
      average_rating: 4.7,
      count: 9,
    })
  })
})
