import type { StoreUpdateCustomerReviewSchemaType } from "./validators"

const CUSTOMER_EDITABLE_REVIEW_FIELDS = ["content", "rating", "title"] as const

export function toCustomerReviewUpdateInput(
  input: StoreUpdateCustomerReviewSchemaType
): StoreUpdateCustomerReviewSchemaType {
  return {
    ...Object.fromEntries(
      CUSTOMER_EDITABLE_REVIEW_FIELDS.flatMap((field) =>
        field in input ? [[field, input[field]]] : []
      )
    ),
    status: "pending",
  }
}
