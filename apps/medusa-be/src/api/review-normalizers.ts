import type { AdminGetReviewsSchemaType } from "./admin/reviews/validators"

export type ProductRecord = {
  handle?: string
  id: string
  thumbnail?: null | string
  title?: string
}

export type ReviewRecord = {
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
  "content" | "created_at" | "first_name" | "id" | "last_name" | "rating" | "title"
>

const LIKE_WILDCARD_REGEX = /[%_\\]/g
const ORDER_FIELDS = new Set(["created_at", "rating", "status", "updated_at"])
const LEADING_DASH_REGEX = /^-/

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

const serializeDate = (date: Date | string | undefined) =>
  date instanceof Date ? date.toISOString() : date

export const normalizeReviewOrder = (input?: string) => {
  const value = input ?? "-created_at"
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
  const escapedQuery = q ? escapeLikePattern(q) : undefined

  return {
    ...(customer_id ? { customer_id } : {}),
    ...(product_id ? { product_id } : {}),
    ...(status ? { status } : {}),
    ...(escapedQuery
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isProductRecord = (value: unknown): value is ProductRecord =>
  isRecord(value) && typeof value.id === "string"

export const isReviewRecord = (value: unknown): value is ReviewRecord =>
  isRecord(value) &&
  typeof value.content === "string" &&
  typeof value.customer_id === "string" &&
  typeof value.id === "string" &&
  typeof value.product_id === "string" &&
  typeof value.rating === "number" &&
  typeof value.status === "string" &&
  typeof value.title === "string"

export const filterProductRecords = (products: unknown): ProductRecord[] =>
  Array.isArray(products) ? products.filter(isProductRecord) : []

export const filterReviewRecords = (reviews: unknown): ReviewRecord[] =>
  Array.isArray(reviews) ? reviews.filter(isReviewRecord) : []

export const getUniqueReviewProductIds = (reviews: ReviewRecord[]) => [
  ...new Set(reviews.map((review) => review.product_id)),
]

export const normalizeAdminReview = (
  review: ReviewRecord,
  productsById: Map<string, ProductRecord>
) => ({
  ...review,
  product: productsById.get(review.product_id) ?? null,
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
