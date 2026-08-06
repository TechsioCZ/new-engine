import { escapeLikePattern } from "../utils/sql"
import type { AdminGetReviewsSchemaType } from "./admin/reviews/validators"

export interface ProductRecord {
  handle?: string
  id: string
  thumbnail?: null | string
  title?: string
}

export interface ReviewRecord {
  content: string
  created_at?: Date | string
  customer_id: string
  first_name?: null | string
  id: string
  last_name?: null | string
  product_id: string
  rating: number
  status: string
  title: string
  updated_at?: Date | string
}

type PublicReviewRecord = Pick<
  ReviewRecord,
  | "content"
  | "created_at"
  | "first_name"
  | "id"
  | "last_name"
  | "rating"
  | "title"
>

const isReviewEntity = (
  value: unknown,
): value is Record<string, unknown> & object =>
  typeof value === "object" && value !== null

const ORDER_FIELDS = new Set(["created_at", "rating", "status", "updated_at"])
const LEADING_DASH_REGEX = /^-/u

const serializeDate = (date: Date | string | undefined) =>
  date instanceof Date ? date.toISOString() : date

const hasText = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0

export const normalizeReviewOrder = (value = "-created_at") => {
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { created_at: "DESC" }
  }

  return {
    [field]: direction,
  }
}

export const normalizeAdminReviewFilters = ({
  customer_id,
  product_id,
  q,
  status,
}: AdminGetReviewsSchemaType): Record<string, unknown> => {
  const escapedQuery = hasText(q) ? escapeLikePattern(q) : undefined

  return {
    ...(hasText(customer_id) ? { customer_id } : {}),
    ...(hasText(product_id) ? { product_id } : {}),
    ...(hasText(status) ? { status } : {}),
    ...(hasText(escapedQuery)
      ? {
          $or: [
            { title: { $ilike: `%${escapedQuery}%` } },
            { content: { $ilike: `%${escapedQuery}%` } },
            { first_name: { $ilike: `%${escapedQuery}%` } },
            { last_name: { $ilike: `%${escapedQuery}%` } },
          ],
        }
      : {}),
  }
}

export const isProductRecord = (value: unknown): value is ProductRecord =>
  isReviewEntity(value) && typeof value["id"] === "string"

export const isReviewRecord = (value: unknown): value is ReviewRecord => {
  if (!isReviewEntity(value)) {
    return false
  }

  const stringFields = [
    "content",
    "customer_id",
    "id",
    "product_id",
    "status",
    "title",
  ] as const
  if (stringFields.some((field) => typeof value[field] !== "string")) {
    return false
  }

  return typeof value["rating"] === "number"
}

export const filterProductRecords = (products: unknown): ProductRecord[] =>
  Array.isArray(products) ? products.filter(isProductRecord) : []

export const filterReviewRecords = (reviews: unknown): ReviewRecord[] =>
  Array.isArray(reviews) ? reviews.filter(isReviewRecord) : []

export const getUniqueReviewProductIds = (reviews: ReviewRecord[]) => [
  ...new Set(reviews.map((review) => review.product_id)),
]

export const normalizeAdminReview = (
  review: ReviewRecord,
  productsById: Map<string, ProductRecord>,
) => ({
  ...review,
  product: productsById.get(review.product_id) ?? null,
})

export const normalizeCustomerReview = (
  review: ReviewRecord,
  productsById: Map<string, ProductRecord>,
) => ({
  content: review.content,
  created_at: serializeDate(review.created_at),
  customer_id: review.customer_id,
  id: review.id,
  product: productsById.get(review.product_id) ?? null,
  product_id: review.product_id,
  rating: review.rating,
  status: review.status,
  title: review.title,
  updated_at: serializeDate(review.updated_at),
})

export const normalizePublicReview = (review: PublicReviewRecord) => ({
  content: review.content,
  created_at: serializeDate(review.created_at),
  customer: {
    first_name: review.first_name,
    last_name: review.last_name,
  },
  id: review.id,
  rating: review.rating,
  title: review.title,
})
