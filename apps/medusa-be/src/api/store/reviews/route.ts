import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createReviewWorkflow } from "../../../workflows/product-review/workflows/create-review"
import { hasExactSlovakReviewScope } from "../review-market-scope"
import {
  createPublicReviewCustomerId,
  ensureProductExists,
  ensureReviewDoesNotExist,
  getAuthenticatedCustomerId,
  getReviewAuthorName,
  getReviewTokenCustomerId,
  retrieveCustomer,
  retrieveReviewToken,
} from "./helpers"
import type { StoreCreateReviewSchemaType } from "./validators"

const REVIEW_TITLE_MAX_LENGTH = 120

const buildReviewTitle = (content: string) =>
  content.trim().slice(0, REVIEW_TITLE_MAX_LENGTH)

export async function POST(
  req: MedusaRequest<StoreCreateReviewSchemaType>,
  res: MedusaResponse
) {
  const {
    content,
    first_name,
    last_name,
    name,
    product_id,
    rating,
    review_token,
    title,
  } = req.validatedBody

  if (!(await hasExactSlovakReviewScope(req, product_id))) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Product reviews are not available for this market."
    )
  }

  const tokenRecord = review_token
    ? await retrieveReviewToken(req, review_token, product_id)
    : undefined
  const authenticatedCustomerId = getAuthenticatedCustomerId(req)
  const customer = authenticatedCustomerId
    ? await retrieveCustomer(req, authenticatedCustomerId)
    : undefined
  const authorName = getReviewAuthorName({
    customer,
    firstName: first_name,
    lastName: last_name,
    name,
    reviewToken: tokenRecord,
  })

  if (!authorName.first_name) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review author name is required."
    )
  }

  await ensureProductExists(req, product_id)

  let customerId: string
  let shouldEnforceDuplicateReview = false

  if (tokenRecord) {
    customerId = getReviewTokenCustomerId(tokenRecord)
    shouldEnforceDuplicateReview = true
  } else if (authenticatedCustomerId) {
    customerId = authenticatedCustomerId
    shouldEnforceDuplicateReview = true
  } else {
    customerId = createPublicReviewCustomerId()
  }

  if (shouldEnforceDuplicateReview) {
    await ensureReviewDoesNotExist({
      customerId,
      productId: product_id,
      req,
    })
  }

  const { result: review } = await createReviewWorkflow(req.scope).run({
    input: {
      review: {
        content,
        customer_id: customerId,
        first_name: authorName.first_name,
        last_name: authorName.last_name,
        product_id,
        rating,
        title: title ?? buildReviewTitle(content),
      },
      review_token_id: tokenRecord?.id,
    },
  })

  res.status(200).json({ review })
}
