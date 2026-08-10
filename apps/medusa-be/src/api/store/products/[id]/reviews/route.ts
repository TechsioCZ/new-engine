import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z as zod } from "@medusajs/framework/zod"

import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"
import {
  filterReviewRecords,
  normalizePublicReview,
} from "../../../../review-normalizers"
import type { StoreGetProductReviewsSchemaType } from "./validators"

const reviewRatingSchema = zod.object({
  rating: zod.number().min(1).max(5),
})

const parseReviewRating = (value: unknown): number | null => {
  const result = reviewRatingSchema.safeParse(value)
  return result.success ? result.data.rating : null
}

const getReviewSummary = async (req: MedusaRequest, productId: string) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const filters = {
    product_id: productId,
    status: "approved",
  }
  const { data: firstPage, metadata } = await query.graph({
    entity: "review",
    fields: ["rating"],
    filters,
    pagination: {
      take: 1,
    },
  })
  const count =
    metadata?.count ?? (Array.isArray(firstPage) ? firstPage.length : 0)

  if (count === 0) {
    return {
      average_rating: 0,
      count: 0,
    }
  }

  const { data } = await query.graph({
    entity: "review",
    fields: ["rating"],
    filters,
    pagination: {
      take: count,
    },
  })
  const ratings = Array.isArray(data)
    ? data.flatMap((review) => {
        const rating = parseReviewRating(review)
        return rating === null ? [] : [rating]
      })
    : []
  const ratingSum = ratings.reduce((sum, rating) => sum + rating, 0)

  return {
    average_rating:
      ratings.length > 0 ? Number((ratingSum / ratings.length).toFixed(1)) : 0,
    count,
  }
}

const get = async (
  req: MedusaRequest<unknown, StoreGetProductReviewsSchemaType>,
  res: MedusaResponse,
) => {
  const { limit, offset } = req.validatedQuery
  const productId =
    typeof req.params["id"] === "string" ? req.params["id"] : undefined

  if (productId === undefined || productId === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product id is required",
    )
  }
  const service = req.scope.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE,
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

export { get as GET }
