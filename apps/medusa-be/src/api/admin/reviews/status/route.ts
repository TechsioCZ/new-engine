import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getUniqueReviewProductIds,
  normalizeAdminReview,
} from "../../../review-normalizers"
import { updateReviewStatusWorkflow } from "../../../../workflows/product-review/workflows/update-review-status"
import { getProductsById } from "../helpers"
import type { AdminUpdateReviewStatusSchemaType } from "../validators"

export async function POST(
  req: MedusaRequest<AdminUpdateReviewStatusSchemaType>,
  res: MedusaResponse
) {
  const { ids, status } = req.validatedBody
  const { result: reviews } = await updateReviewStatusWorkflow(req.scope).run({
    input: {
      ids,
      status,
    },
  })
  const productsById = await getProductsById(
    req,
    getUniqueReviewProductIds(reviews)
  )

  res.status(200).json({
    reviews: reviews.map((review) => normalizeAdminReview(review, productsById)),
  })
}
