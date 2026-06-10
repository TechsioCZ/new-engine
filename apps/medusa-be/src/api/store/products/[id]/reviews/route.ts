import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  filterReviewRecords,
  normalizePublicReview,
} from "../../../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"
import type { StoreGetProductReviewsSchemaType } from "./validators"

const REVIEW_SUMMARY_BATCH_SIZE = Math.min(
  Math.max(Number(process.env.PRODUCT_REVIEW_SUMMARY_BATCH_SIZE) || 500, 1),
  1000
)

type ReviewRatingRecord = {
  rating: number
}

const isReviewRatingRecord = (value: unknown): value is ReviewRatingRecord =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).rating === "number"

async function getReviewSummary(req: MedusaRequest, productId: string) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  let offset = 0
  let totalCount: number | undefined
  let ratingSum = 0
  let ratingCount = 0

  do {
    const { data, metadata } = await query.graph({
      entity: "review",
      fields: ["rating"],
      filters: {
        product_id: productId,
        status: "approved",
      },
      pagination: {
        skip: offset,
        take: REVIEW_SUMMARY_BATCH_SIZE,
      },
    })
    const ratings = Array.isArray(data) ? data.filter(isReviewRatingRecord) : []

    for (const review of ratings) {
      ratingSum += review.rating
      ratingCount += 1
    }

    totalCount = metadata?.count ?? ratingCount
    offset += REVIEW_SUMMARY_BATCH_SIZE
  } while (offset < totalCount)

  return {
    average_rating:
      ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : 0,
    count: totalCount ?? ratingCount,
  }
}

export async function GET(
  req: MedusaRequest<unknown, StoreGetProductReviewsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const productId = typeof req.params.id === "string" ? req.params.id : undefined

  if (!productId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Product id is required")
  }
  const service = req.scope.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE
  )
  const filters = {
    product_id: productId,
    status: "approved",
  }
  const [reviews, count] = await service.listAndCountReviews(filters, {
    order: { created_at: "DESC" },
    skip: offset,
    take: limit,
  })
  const reviewRecords = filterReviewRecords(reviews)
  const summary = await getReviewSummary(req, productId)

  res.json({
    count,
    limit,
    offset,
    reviews: reviewRecords.map(normalizePublicReview),
    summary,
  })
}
