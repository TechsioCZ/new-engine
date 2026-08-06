import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import { updateReviewWorkflow } from "../../../../workflows/product-review/workflows/update-review"
import {
  isReviewRecord,
  normalizeAdminReview,
} from "../../../review-normalizers"
import { getProductsById } from "../helpers"
import type { AdminUpdateReviewSchemaType } from "../validators"

const getReviewRouteId = (req: MedusaRequest) =>
  typeof req.params["id"] === "string" ? req.params["id"] : undefined

const getNormalizedReview = async (req: MedusaRequest, id: string) => {
  const review = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .retrieveReview(id)

  if (!isReviewRecord(review)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review was not found")
  }

  const productsById = await getProductsById(req, [review.product_id])

  return normalizeAdminReview(review, productsById)
}

const getRoute = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const id = getReviewRouteId(req)

  if (id === undefined || id === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review id is required",
    )
  }

  res.json({ review: await getNormalizedReview(req, id) })
}

const patchRoute = async (
  req: AuthenticatedMedusaRequest<AdminUpdateReviewSchemaType>,
  res: MedusaResponse,
) => {
  const id = getReviewRouteId(req)

  if (id === undefined || id === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review id is required",
    )
  }

  const { result: review } = await updateReviewWorkflow(req.scope).run({
    input: {
      id,
      review: omitUndefined(req.validatedBody),
    },
  })
  const productsById = await getProductsById(req, [review.product_id])

  res.json({ review: normalizeAdminReview(review, productsById) })
}

export { getRoute as GET, patchRoute as PATCH }
