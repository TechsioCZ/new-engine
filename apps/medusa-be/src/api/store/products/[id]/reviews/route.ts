import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  normalizePublicReview,
  type ReviewRecord,
} from "../../../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"
import type { StoreGetProductReviewsSchemaType } from "./validators"

export async function GET(
  req: MedusaRequest<unknown, StoreGetProductReviewsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const service = req.scope.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE
  )
  const filters = {
    product_id: req.params.id,
    status: "approved",
  }
  const [reviews, count] = await service.listAndCountReviews(filters, {
    order: { created_at: "DESC" },
    skip: offset,
    take: limit,
  })
  const allApprovedReviews = await service.listReviews(filters, {
    select: ["rating"],
  })
  const ratingTotal = allApprovedReviews.reduce(
    (total, review) => total + Number(review.rating ?? 0),
    0
  )
  const averageRating = allApprovedReviews.length
    ? Math.round((ratingTotal / allApprovedReviews.length) * 10) / 10
    : 0

  res.json({
    count,
    limit,
    offset,
    reviews: (reviews as ReviewRecord[]).map(normalizePublicReview),
    summary: {
      average_rating: averageRating,
      count: allApprovedReviews.length,
    },
  })
}
