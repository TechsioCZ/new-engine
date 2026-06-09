import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import type { AdminUpdateReviewStatusSchemaType } from "../validators"

export async function POST(
  req: MedusaRequest<AdminUpdateReviewStatusSchemaType>,
  res: MedusaResponse
) {
  const { ids, status } = req.validatedBody
  const reviews = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .updateReviews(
      ids.map((id) => ({
        id,
        status,
      }))
    )

  res.status(200).json({ reviews })
}
