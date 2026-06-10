import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getUniqueReviewProductIds,
  normalizeAdminReview,
  type ReviewRecord,
} from "../../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import { getProductsById } from "../helpers"
import type { AdminUpdateReviewStatusSchemaType } from "../validators"

export async function POST(
  req: MedusaRequest<AdminUpdateReviewStatusSchemaType>,
  res: MedusaResponse
) {
  const { ids, status } = req.validatedBody
  const reviews = (await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .updateReviews(
      ids.map((id) => ({
        id,
        status,
      }))
    )) as ReviewRecord[]
  const productsById = await getProductsById(
    req,
    getUniqueReviewProductIds(reviews)
  )

  res.status(200).json({
    reviews: reviews.map((review) => normalizeAdminReview(review, productsById)),
  })
}
