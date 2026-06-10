import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  filterReviewRecords,
  normalizePublicReview,
} from "../../../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"
import type { StoreGetProductReviewsSchemaType } from "./validators"

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
  const summary = await service.getReviewSummary(productId)

  res.json({
    count,
    limit,
    offset,
    reviews: reviewRecords.map(normalizePublicReview),
    summary,
  })
}
