import type { StoreUpdateCustomerReviewSchemaType } from "./validators"

const CUSTOMER_EDITABLE_REVIEW_FIELDS = ["content", "rating", "title"] as const

export const toCustomerReviewUpdateInput = (
  input: StoreUpdateCustomerReviewSchemaType,
): StoreUpdateCustomerReviewSchemaType => ({
  ...Object.fromEntries(
    CUSTOMER_EDITABLE_REVIEW_FIELDS.flatMap((field) =>
      field in input ? [[field, input[field]]] : [],
    ),
  ),
  status: "pending",
})
