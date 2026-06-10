import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  filterReviewRecords,
  getUniqueReviewProductIds,
  normalizeAdminReview,
  normalizeAdminReviewFilters,
  normalizeReviewOrder,
} from "../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import { getProductsById } from "./helpers"
import type { AdminGetReviewsSchemaType } from "./validators"

export async function GET(
  req: MedusaRequest<unknown, AdminGetReviewsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const order = normalizeReviewOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const filters = normalizeAdminReviewFilters(req.validatedQuery)
  const [reviews, count] = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .listAndCountReviews(filters, {
      order,
      skip: offset,
      take: limit,
    })
  const reviewRecords = filterReviewRecords(reviews)
  const productsById = await getProductsById(
    req,
    getUniqueReviewProductIds(reviewRecords)
  )

  res.json({
    count,
    limit,
    offset,
    reviews: reviewRecords.map((review) => normalizeAdminReview(review, productsById)),
  })
}
