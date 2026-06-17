import type Medusa from "@medusajs/js-sdk"
import type {
  CreateProductReviewInput,
  ProductReviewListResponse,
  ProductReviewService,
  ReviewBase,
} from "./types"

type StoreProductReviewsQuery = {
  limit?: number
  offset?: number
}

export type MedusaProductReviewListInput = StoreProductReviewsQuery & {
  productId?: string
  page?: number
  enabled?: boolean
}

export type MedusaCreateProductReviewInput = CreateProductReviewInput

type StoreProductReviewsResponse<TReview> = ProductReviewListResponse<TReview>

type StoreCreateProductReviewResponse<TReview> = {
  review: TReview
}

const REVIEW_SUMMARY_REPAIR_LIMIT = 100

export type MedusaProductReviewServiceConfig<TReview> = {
  listPath?: string
  transformReview?: (review: ReviewBase) => TReview
}

const stripListInput = (
  input: MedusaProductReviewListInput
): StoreProductReviewsQuery => {
  const {
    enabled: _enabled,
    page: _page,
    productId: _productId,
    ...query
  } = input

  return query
}

const calculateReviewSummary = (reviews: ReviewBase[]) => {
  if (!reviews.length) {
    return {
      average_rating: 0,
      count: 0,
    }
  }

  const ratingSum = reviews.reduce((sum, review) => sum + review.rating, 0)

  return {
    average_rating: Number((ratingSum / reviews.length).toFixed(1)),
    count: reviews.length,
  }
}

const hasCompleteReviewSet = (response: StoreProductReviewsResponse<ReviewBase>) =>
  response.count === response.reviews.length

const hasInconsistentSummary = (
  response: StoreProductReviewsResponse<ReviewBase>
) => response.summary.count !== response.count

export function createMedusaProductReviewService<
  TReview = ReviewBase,
>(
  sdk: Medusa,
  config?: MedusaProductReviewServiceConfig<TReview>
): ProductReviewService<TReview, MedusaProductReviewListInput> {
  const { listPath = "/store/products", transformReview } = config ?? {}
  const mapReview =
    transformReview ?? ((review) => review as unknown as TReview)

  return {
    async listProductReviews(
      params: MedusaProductReviewListInput,
      signal?: AbortSignal
    ): Promise<ProductReviewListResponse<TReview>> {
      if (!params.productId) {
        return {
          count: 0,
          limit: params.limit ?? 0,
          offset: params.offset ?? 0,
          reviews: [],
          summary: {
            average_rating: 0,
            count: 0,
          },
        }
      }

      const query = stripListInput(params)
      const response = await sdk.client.fetch<
        StoreProductReviewsResponse<ReviewBase>
      >(`${listPath}/${params.productId}/reviews`, {
        query,
        signal,
      })
      let summary = response.summary

      if (hasCompleteReviewSet(response)) {
        summary = calculateReviewSummary(response.reviews)
      } else if (
        hasInconsistentSummary(response) &&
        response.count <= REVIEW_SUMMARY_REPAIR_LIMIT
      ) {
        const summaryResponse = await sdk.client.fetch<
          StoreProductReviewsResponse<ReviewBase>
        >(`${listPath}/${params.productId}/reviews`, {
          query: {
            ...query,
            limit: response.count,
            offset: 0,
          },
          signal,
        })

        if (hasCompleteReviewSet(summaryResponse)) {
          summary = calculateReviewSummary(summaryResponse.reviews)
        }
      }

      return {
        ...response,
        reviews: response.reviews.map(mapReview),
        summary,
      }
    },

    async createProductReview(
      input: MedusaCreateProductReviewInput
    ): Promise<TReview> {
      const response = await sdk.client.fetch<
        StoreCreateProductReviewResponse<ReviewBase>
      >("/store/reviews", {
        method: "POST",
        body: input,
      })

      return mapReview(response.review)
    },
  }
}
