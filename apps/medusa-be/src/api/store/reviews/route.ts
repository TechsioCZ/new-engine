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

const post = async (
  req: MedusaRequest<StoreCreateReviewSchemaType>,
  res: MedusaResponse,
) => {
  const { content, product_id, rating, review_token, title } = req.validatedBody
  const tokenRecord =
    typeof review_token === "string" && review_token.length > 0
      ? await retrieveReviewToken(req, review_token, product_id)
      : undefined
  const authenticatedCustomerId =
    tokenRecord === undefined ? getAuthenticatedCustomerId(req) : null
  if (tokenRecord === undefined && authenticatedCustomerId === null) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review token is required for guest reviews.",
    )
  }

  const customerId =
    tokenRecord === undefined
      ? authenticatedCustomerId
      : getReviewTokenCustomerId(tokenRecord)

  if (!(typeof customerId === "string" && customerId.length > 0)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review customer could not be resolved.",
    )
  }

  const isGuestReview =
    tokenRecord !== undefined && tokenRecord.customer_id === null

  await ensureProductExists(req, product_id)

  if (authenticatedCustomerId !== null) {
    await ensureCustomerPurchasedProduct(
      req,
      authenticatedCustomerId,
      product_id,
    )
  }

  await ensureReviewDoesNotExist({
    customerId,
    productId: product_id,
    req,
  })

  const customer =
    authenticatedCustomerId === null
      ? undefined
      : await retrieveCustomer(req, authenticatedCustomerId)
  const authorName = getReviewAuthorName({
    ...(customer === undefined ? {} : { customer }),
    isGuest: isGuestReview,
    ...(tokenRecord === undefined ? {} : { reviewToken: tokenRecord }),
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
      ...(tokenRecord === undefined ? {} : { review_token_id: tokenRecord.id }),
    },
  })

  res.status(200).json({ review })
}

export { post as POST }
