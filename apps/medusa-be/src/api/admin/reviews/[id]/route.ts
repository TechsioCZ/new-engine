import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import { updateReviewWorkflow } from "../../../../workflows/product-review/workflows/update-review"
import {
  isReviewRecord,
  normalizeAdminReview,
} from "../../../review-normalizers"
import { getProductsById } from "../helpers"
import type { AdminUpdateReviewSchemaType } from "../validators"

export const AUTHENTICATE = false

const CUSTOMER_EDITABLE_REVIEW_FIELDS = ["content", "rating", "title"] as const

const getReviewRouteId = (req: MedusaRequest) =>
  typeof req.params.id === "string" ? req.params.id : undefined

async function getNormalizedReview(
  req: MedusaRequest,
  id: string,
  customerId?: string
) {
  const review = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .retrieveReview(id)

  if (
    !isReviewRecord(review) ||
    (customerId && review.customer_id !== customerId)
  ) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review was not found")
  }

  const productsById = await getProductsById(req, [review.product_id])

  return normalizeAdminReview(review, productsById)
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = getReviewRouteId(req)

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review id is required"
    )
  }

  const customerId =
    req.auth_context.actor_type === "customer"
      ? req.auth_context.actor_id
      : undefined

  res.json({ review: await getNormalizedReview(req, id, customerId) })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest<AdminUpdateReviewSchemaType>,
  res: MedusaResponse
) {
  const id = getReviewRouteId(req)

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review id is required"
    )
  }

  const isCustomerAuthorEdit = req.auth_context.actor_type === "customer"
  let reviewInput = req.validatedBody

  if (isCustomerAuthorEdit) {
    const existingReview = await req.scope
      .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .retrieveReview(id)

    if (
      !isReviewRecord(existingReview) ||
      existingReview.customer_id !== req.auth_context.actor_id
    ) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review was not found")
    }

    reviewInput = {
      ...Object.fromEntries(
        CUSTOMER_EDITABLE_REVIEW_FIELDS.flatMap((field) =>
          field in req.validatedBody ? [[field, req.validatedBody[field]]] : []
        )
      ),
      status: "pending",
    }
  }

  const { result: review } = await updateReviewWorkflow(req.scope).run({
    input: {
      id,
      review: reviewInput,
    },
  })
  const productsById = await getProductsById(req, [review.product_id])

  res.json({ review: normalizeAdminReview(review, productsById) })
}
