import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import { createReviewWorkflow } from "../../../workflows/product-review/workflows/create-review"
import { ensureProductExists, getCustomerId, retrieveCustomer } from "./helpers"
import type { StoreCreateReviewSchemaType } from "./validators"

export async function POST(
  req: MedusaRequest<StoreCreateReviewSchemaType>,
  res: MedusaResponse
) {
  const customerId = getCustomerId(req)
  const { content, product_id, rating, title } = req.validatedBody

  await ensureProductExists(req, product_id)

  const [existingReview] = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .listReviews(
      {
        customer_id: customerId,
        product_id,
      },
      {
        take: 1,
      }
    )

  if (existingReview) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "You have already reviewed this product."
    )
  }

  const customer = await retrieveCustomer(req, customerId)
  const { result: review } = await createReviewWorkflow(req.scope).run({
    input: {
      review: {
        content,
        customer_id: customerId,
        first_name: customer?.first_name ?? null,
        last_name: customer?.last_name ?? null,
        product_id,
        rating,
        title,
      },
    },
  })

  res.status(200).json({ review })
}
