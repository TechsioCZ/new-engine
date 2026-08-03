import type Medusa from "@medusajs/js-sdk"

import type { IsExactly } from "../shared/type-utils"
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

type MedusaProductReviewServiceConfigBase = {
  listPath?: string
}

export type MedusaProductReviewServiceConfig<TReview> =
  MedusaProductReviewServiceConfigBase &
    (IsExactly<TReview, ReviewBase> extends true
      ? { transformReview?: (review: ReviewBase) => TReview }
      : { transformReview: (review: ReviewBase) => TReview })

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

const hasCompleteReviewSet = (
  response: StoreProductReviewsResponse<ReviewBase>
) => response.count === response.reviews.length

const hasInconsistentSummary = (
  response: StoreProductReviewsResponse<ReviewBase>
) => response.summary.count !== response.count

type MedusaProductReviewServiceArgs<TReview> =
  IsExactly<TReview, ReviewBase> extends true
    ? [config?: MedusaProductReviewServiceConfig<TReview>]
    : [config: MedusaProductReviewServiceConfig<TReview>]

export function createMedusaProductReviewService<TReview = ReviewBase>(
  sdk: Medusa,
  ...[config]: MedusaProductReviewServiceArgs<TReview>
): ProductReviewService<TReview, MedusaProductReviewListInput>
export function createMedusaProductReviewService(
  sdk: Medusa,
  config?: MedusaProductReviewServiceConfigBase & {
    transformReview?: (review: ReviewBase) => unknown
  }
): ProductReviewService<unknown, MedusaProductReviewListInput> {
  const { listPath = "/store/products", transformReview } = config ?? {}
  const mapReview = transformReview ?? ((review: ReviewBase) => review)

  return {
    async listProductReviews(
      params: MedusaProductReviewListInput,
      signal?: AbortSignal
    ): Promise<ProductReviewListResponse<unknown>> {
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
        signal: signal ?? null,
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
          signal: signal ?? null,
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
    ): Promise<unknown> {
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
