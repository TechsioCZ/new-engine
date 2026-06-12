import type { UseMutationResult } from "@tanstack/react-query"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { MutationOptions } from "../shared/hook-types"
import type { QueryKey } from "../shared/query-keys"

export type ReviewCustomerBase = {
  first_name?: null | string
  last_name?: null | string
}

export type ReviewBase = {
  content: string
  created_at?: string
  customer?: null | ReviewCustomerBase
  id: string
  rating: number
  title: string
}

export type ReviewSummary = {
  average_rating: number
  count: number
}

export type ProductReviewListInputBase = {
  productId?: string
  limit?: number
  offset?: number
  page?: number
  enabled?: boolean
}

export type ProductReviewListResponse<TReview> = {
  count: number
  limit: number
  offset: number
  reviews: TReview[]
  summary: ReviewSummary
}

export type CreateProductReviewInput = {
  content: string
  product_id: string
  rating: number
  review_token?: string
  title: string
}

export type ProductReviewService<
  TReview,
  TListParams,
  TCreateInput extends CreateProductReviewInput = CreateProductReviewInput,
> = {
  listProductReviews: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<ProductReviewListResponse<TReview>>
  createProductReview: (input: TCreateInput) => Promise<TReview>
}

export type ProductReviewQueryKeys<TListParams> = {
  all: () => QueryKey
  productList: (params: TListParams) => QueryKey
}

export type UseProductReviewsResult<TReview> = ReadResultBase<
  QueryResult<ProductReviewListResponse<TReview>>
> & {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  reviews: TReview[]
  summary: ReviewSummary
  totalCount: number
  totalPages: number
}

export type UseSuspenseProductReviewsResult<TReview> = SuspenseResultBase<
  SuspenseQueryResult<ProductReviewListResponse<TReview>>
> & {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  reviews: TReview[]
  summary: ReviewSummary
  totalCount: number
  totalPages: number
}

export type ProductReviewMutationOptions<
  TReview,
  TCreateInput extends CreateProductReviewInput,
  TContext = unknown,
> = MutationOptions<TReview, TCreateInput, TContext>

export type UseCreateProductReviewResult<
  TReview,
  TCreateInput extends CreateProductReviewInput,
  TContext = unknown,
> = UseMutationResult<TReview, unknown, TCreateInput, TContext>
