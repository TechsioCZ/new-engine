export type ReviewStatus = "approved" | "pending" | "rejected"

export type CreateReviewInput = {
  content: string
  customer_id: string
  first_name?: null | string
  last_name?: null | string
  product_id: string
  rating: number
  status?: ReviewStatus
  title: string
}

export type CreateReviewWorkflowInput = {
  review: CreateReviewInput
  review_token_id?: string
}
