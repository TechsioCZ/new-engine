import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PRODUCT_REVIEW_MODULE } from "../../../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../../../modules/product-review/service"
import type { UpdateReviewInput } from "../../../../../../workflows/product-review/types"
import { updateReviewWorkflow } from "../../../../../../workflows/product-review/workflows/update-review"
import {
  isReviewRecord,
  normalizeCustomerReview,
} from "../../../../../review-normalizers"
import { getProductsById } from "../../../../../review-products"
import { toCustomerReviewUpdateInput } from "../helpers"
import type { StoreUpdateCustomerReviewSchemaType } from "../validators"

const getReviewRouteId = (req: AuthenticatedMedusaRequest) =>
  typeof req.params["id"] === "string" ? req.params["id"] : undefined

const toExactCustomerReviewUpdateInput = (
  input: StoreUpdateCustomerReviewSchemaType,
): UpdateReviewInput => {
  const review = toCustomerReviewUpdateInput(input)

  return {
    ...(review.content === undefined ? {} : { content: review.content }),
    ...(review.rating === undefined ? {} : { rating: review.rating }),
    status: "pending",
    ...(review.title === undefined ? {} : { title: review.title }),
  }
}

const assertCustomerOwnsReview = async (
  req: AuthenticatedMedusaRequest,
  id: string,
) => {
  const review = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .retrieveReview(id)

  if (
    !isReviewRecord(review) ||
    review.customer_id !== req.auth_context.actor_id
  ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review was not found")
  }
}

const updateCustomerReview = async (
  req: AuthenticatedMedusaRequest<StoreUpdateCustomerReviewSchemaType>,
  res: MedusaResponse,
) => {
  const id = getReviewRouteId(req)

  if (id === undefined || id.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review id is required",
    )
  }

  await assertCustomerOwnsReview(req, id)

  const { result: review } = await updateReviewWorkflow(req.scope).run({
    input: {
      id,
      review: toExactCustomerReviewUpdateInput(req.validatedBody),
    },
  })

  if (!isReviewRecord(review)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Review workflow returned invalid review data",
    )
  }

  const productsById = await getProductsById(req, [review.product_id])

  res.json({ review: normalizeCustomerReview(review, productsById) })
}

export { updateCustomerReview as PATCH }
