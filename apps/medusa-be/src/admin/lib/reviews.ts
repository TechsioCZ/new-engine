import { getRecordValue } from "@techsio/std/object"

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

const toSearch = (params: object) => {
  const search = new URLSearchParams()

  for (const key of Object.keys(params)) {
    const value = getRecordValue(params, key)
    if (
      typeof value === "number" ||
      (typeof value === "string" && value !== "")
    ) {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

interface ListReviewsParams {
  limit: number
  offset: number
  order_by?: string
  q?: string
  status?: ReviewStatus
}

export const reviewQueryKeys = {
  detail: (id: string) => ["reviews", id] as const,
  list: (params: ListReviewsParams) => ["reviews", params] as const,
  lists: () => ["reviews"] as const,
}

export const listReviews = async (params: ListReviewsParams) =>
  await sdk.client.fetch<ReviewsResponse>(`/admin/reviews?${toSearch(params)}`)

export const retrieveReview = async (id: string) =>
  await sdk.client.fetch<ReviewResponse>(`/admin/reviews/${id}`)

export const updateReview = async (id: string, input: ReviewInput) =>
  await sdk.client.fetch<ReviewResponse>(`/admin/reviews/${id}`, {
    body: input,
    method: "PATCH",
  })

export const updateReviewStatus = async (input: {
  ids: string[]
  status: ReviewStatus
}) =>
  await sdk.client.fetch<UpdateReviewStatusResponse>("/admin/reviews/status", {
    body: input,
    method: "POST",
  })
