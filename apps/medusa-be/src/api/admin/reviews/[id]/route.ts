import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  normalizeAdminReview,
  type ReviewRecord,
} from "../../../review-normalizers"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import { getProductsById } from "../helpers"
import type { AdminUpdateReviewSchemaType } from "../validators"

type ReviewRouteParams = {
  id: string
}

async function getNormalizedReview(req: MedusaRequest, id: string) {
  const review = (await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .retrieveReview(id)) as ReviewRecord

  const productsById = await getProductsById(req, [review.product_id])

  return normalizeAdminReview(review, productsById)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as ReviewRouteParams

  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Review id is required")
  }

  res.json({ review: await getNormalizedReview(req, id) })
}

export async function PATCH(
  req: MedusaRequest<AdminUpdateReviewSchemaType>,
  res: MedusaResponse
) {
  const { id } = req.params as ReviewRouteParams

  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Review id is required")
  }

  await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .updateReviews({
      id,
      ...req.validatedBody,
    })

  res.json({ review: await getNormalizedReview(req, id) })
}
