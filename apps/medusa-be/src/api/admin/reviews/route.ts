import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getUniqueReviewProductIds,
  normalizeAdminReview,
  normalizeAdminReviewFilters,
  normalizeReviewOrder,
  type ReviewRecord,
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
  const productsById = await getProductsById(
    req,
    getUniqueReviewProductIds(reviews as ReviewRecord[])
  )

  res.json({
    count,
    limit,
    offset,
    reviews: (reviews as ReviewRecord[]).map((review) =>
      normalizeAdminReview(review, productsById)
    ),
  })
}
