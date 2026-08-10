import type { InferTypeOf } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"

import type Review from "../modules/product-review/models/review"
import { escapeLikePattern } from "../utils/sql"
import type { AdminGetReviewsSchemaType } from "./admin/reviews/validators"

const productRecordSchema = z.object({
  handle: z.string(),
  id: z.string(),
  thumbnail: z.union([z.null(), z.string()]),
  title: z.string(),
})

const reviewTimestampSchema = z.union([z.date(), z.string()])

const reviewRecordSchema = z.object({
  content: z.string(),
  created_at: reviewTimestampSchema,
  customer_id: z.string(),
  deleted_at: z.union([reviewTimestampSchema, z.null()]).optional(),
  first_name: z.union([z.null(), z.string()]),
  id: z.string(),
  last_name: z.union([z.null(), z.string()]),
  product_id: z.string(),
  rating: z.number().min(1).max(5),
  status: z.enum(["approved", "pending", "rejected"]),
  title: z.string(),
  updated_at: reviewTimestampSchema.optional(),
})

export type ProductRecord = z.infer<typeof productRecordSchema>

type ReviewEntityRecord = InferTypeOf<typeof Review>
type ReviewTimestamp = Date | string

export type ReviewRecord = Omit<
  ReviewEntityRecord,
  "created_at" | "deleted_at" | "updated_at"
> & {
  created_at: ReviewTimestamp
  deleted_at?: null | ReviewTimestamp
  updated_at?: ReviewTimestamp
}

export type PublicReviewRecord = Pick<
  ReviewRecord,
  | "content"
  | "created_at"
  | "first_name"
  | "id"
  | "last_name"
  | "rating"
  | "title"
>

const ORDER_FIELDS = new Set(["created_at", "rating", "status", "updated_at"])
const LEADING_DASH_REGEX = /^-/u

type OptionalReviewTimestamp = ReviewTimestamp | undefined

const serializeDate = (date: OptionalReviewTimestamp) =>
  date instanceof Date ? date.toISOString() : date

const serializeNullableDate = (date: OptionalReviewTimestamp | null) =>
  date === null ? null : serializeDate(date)

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
}: AdminGetReviewsSchemaType) => {
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
  productRecordSchema.safeParse(value).success

export const isReviewRecord = (value: unknown): value is ReviewRecord =>
  reviewRecordSchema.safeParse(value).success

export const filterProductRecords = (products: unknown): ProductRecord[] =>
  Array.isArray(products) ? products.filter(isProductRecord) : []

export const filterReviewRecords = (reviews: unknown): ReviewRecord[] =>
  Array.isArray(reviews) ? reviews.filter(isReviewRecord) : []

export const getUniqueReviewProductIds = (reviews: readonly ReviewRecord[]) => [
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
  ...review,
  created_at: serializeDate(review.created_at),
  deleted_at: serializeNullableDate(review.deleted_at),
  product: productsById.get(review.product_id) ?? null,
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
