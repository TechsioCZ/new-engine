import { sdk } from "./sdk"

export type ReviewStatus = "approved" | "pending" | "rejected"

export type ReviewProduct = {
  handle?: string
  id: string
  thumbnail?: null | string
  title?: string
}

export type Review = {
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

export type ReviewsResponse = {
  count: number
  limit: number
  offset: number
  reviews: Review[]
}

export type UpdateReviewStatusResponse = {
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
  list: (params: Record<string, unknown>) => ["reviews", params] as const,
  lists: () => ["reviews"] as const,
}

export const listReviews = (params: {
  limit: number
  offset: number
  order_by?: string
  q?: string
  status?: ReviewStatus
}) => sdk.client.fetch<ReviewsResponse>(`/admin/reviews?${toSearch(params)}`)

export const updateReviewStatus = (input: {
  ids: string[]
  status: ReviewStatus
}) =>
  sdk.client.fetch<UpdateReviewStatusResponse>("/admin/reviews/status", {
    body: input,
    method: "POST",
  })
