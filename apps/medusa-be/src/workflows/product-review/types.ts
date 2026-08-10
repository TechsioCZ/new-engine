export type ReviewStatus = "approved" | "pending" | "rejected"

export interface CreateReviewInput {
  content: string
  customer_id: string
  first_name?: null | string
  last_name?: null | string
  product_id: string
  rating: number
  status?: ReviewStatus
  title: string
}

export interface CreateReviewWorkflowInput {
  review: CreateReviewInput
  review_token_id?: string
}

export type UpdateReviewInput = Partial<
  Pick<
    CreateReviewInput,
    "content" | "first_name" | "last_name" | "rating" | "status" | "title"
  >
>

export interface UpdateReviewWorkflowInput {
  id: string
  review: UpdateReviewInput
}

export interface UpdateReviewStatusWorkflowInput {
  ids: string[]
  status: ReviewStatus
}
