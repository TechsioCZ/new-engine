import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../modules/product-review/service"
import {
  filterReviewRecords,
  getUniqueReviewProductIds,
  normalizeCustomerReview,
} from "../../../../review-normalizers"
import { getProductsById } from "../../../../review-products"
import type { StoreGetCustomerReviewsSchemaType } from "./validators"

export async function GET(
  req: AuthenticatedMedusaRequest<unknown, StoreGetCustomerReviewsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const reviewService = req.scope.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE
  )

  const [reviewResults, count] = await reviewService.listAndCountReviews(
    {
      customer_id: req.auth_context.actor_id,
    },
    {
      order: { created_at: "DESC" },
      skip: offset,
      take: limit,
    }
  )
  const reviews = filterReviewRecords(reviewResults)
  const productsById = await getProductsById(
    req,
    getUniqueReviewProductIds(reviews)
  )

  res.json({
    count,
    limit,
    offset,
    reviews: reviews.map((review) =>
      normalizeCustomerReview(review, productsById)
    ),
  })
}
