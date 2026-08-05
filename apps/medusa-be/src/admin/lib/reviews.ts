import { sdk } from "./sdk"

export type ReviewStatus = "approved" | "pending" | "rejected"

export interface ReviewProduct {
  handle?: string
  id: string
  thumbnail?: null | string
  title?: string
}

export interface Review {
  content: string
  created_at?: string
  customer_id: string
  first_name?: null | string
  id: string
  last_name?: null | string
  product?: null | ReviewProduct
  product_id: string
  rating: number
  status: ReviewStatus
  title: string
  updated_at?: string
}

export interface ReviewsResponse {
  count: number
  limit: number
  offset: number
  reviews: Review[]
}

export interface ReviewFormInput {
  content: string
  first_name?: null | string
  last_name?: null | string
  rating: number
  status: ReviewStatus
  title: string
}

export type ReviewInput = Partial<ReviewFormInput>

export interface ReviewResponse {
  review: Review
}

export interface UpdateReviewStatusResponse {
  reviews: Review[]
}

const toSearch = (params: Record<string, number | string | undefined>) => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

export const reviewQueryKeys = {
  detail: (id: string) => ["reviews", id] as const,
  list: (params: Record<string, unknown>) => ["reviews", params] as const,
  lists: () => ["reviews"] as const,
}

export const listReviews = async (params: {
  limit: number
  offset: number
  order_by?: string
  q?: string
  status?: ReviewStatus
}) => sdk.client.fetch<ReviewsResponse>(`/admin/reviews?${toSearch(params)}`)

export const retrieveReview = async (id: string) =>
  sdk.client.fetch<ReviewResponse>(`/admin/reviews/${id}`)

export const updateReview = async (id: string, input: ReviewInput) =>
  sdk.client.fetch<ReviewResponse>(`/admin/reviews/${id}`, {
    body: input,
    method: "PATCH",
  })

export const updateReviewStatus = async (input: {
  ids: string[]
  status: ReviewStatus
}) =>
  sdk.client.fetch<UpdateReviewStatusResponse>("/admin/reviews/status", {
    body: input,
    method: "POST",
  })
