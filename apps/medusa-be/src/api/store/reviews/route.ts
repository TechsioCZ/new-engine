import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createReviewWorkflow } from "../../../workflows/product-review/workflows/create-review"
import {
  ensureCustomerPurchasedProduct,
  ensureProductExists,
  ensureReviewDoesNotExist,
  getAuthenticatedCustomerId,
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
  const authenticatedCustomerId = tokenRecord
    ? undefined
    : getAuthenticatedCustomerId(req)
  if (!(tokenRecord || authenticatedCustomerId)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review token is required for guest reviews."
    )
  }

  const customerId = tokenRecord
    ? getReviewTokenCustomerId(tokenRecord)
    : authenticatedCustomerId

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review customer could not be resolved."
    )
  }

  const isGuestReview = Boolean(tokenRecord && !tokenRecord.customer_id)

  await ensureProductExists(req, product_id)

  if (authenticatedCustomerId) {
    await ensureCustomerPurchasedProduct(
      req,
      authenticatedCustomerId,
      product_id
    )
  }

  await ensureReviewDoesNotExist({
    customerId,
    productId: product_id,
    req,
  })

  const customer = authenticatedCustomerId
    ? await retrieveCustomer(req, authenticatedCustomerId)
    : undefined
  const authorName = getReviewAuthorName({
    customer,
    isGuest: isGuestReview,
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
