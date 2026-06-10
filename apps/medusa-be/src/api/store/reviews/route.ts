import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createReviewWorkflow } from "../../../workflows/product-review/workflows/create-review"
import {
  ensureProductExists,
  ensureReviewDoesNotExist,
  getCustomerId,
  getReviewAuthorName,
  getReviewTokenCustomerId,
  retrieveCustomer,
  retrieveReviewToken,
} from "./helpers"
import type { StoreCreateReviewSchemaType } from "./validators"

export async function POST(
  req: MedusaRequest<StoreCreateReviewSchemaType>,
  res: MedusaResponse
) {
  const { content, product_id, rating, review_token, title } = req.validatedBody
  const tokenRecord = review_token
    ? await retrieveReviewToken(req, review_token, product_id)
    : undefined
  const customerId = tokenRecord
    ? getReviewTokenCustomerId(tokenRecord)
    : getCustomerId(req)

  await ensureProductExists(req, product_id)
  await ensureReviewDoesNotExist({
    customerId,
    productId: product_id,
    req,
  })

  const customer = tokenRecord ? undefined : await retrieveCustomer(req, customerId)
  const authorName = getReviewAuthorName({
    customer,
    reviewToken: tokenRecord,
  })
  const { result: review } = await createReviewWorkflow(req.scope).run({
    input: {
      review: {
        content,
        customer_id: customerId,
        first_name: authorName.first_name,
        last_name: authorName.last_name,
        product_id,
        rating,
        title,
      },
      review_token_id: tokenRecord?.id,
    },
  })

  res.status(200).json({ review })
}
