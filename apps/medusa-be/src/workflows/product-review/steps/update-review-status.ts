import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import type { UpdateReviewStatusWorkflowInput } from "../types"

export const updateReviewStatusStep = createStep(
  "update-review-status",
  async (input: UpdateReviewStatusWorkflowInput, { container }) => {
    const service = container.resolve<ProductReviewModuleService>(
      PRODUCT_REVIEW_MODULE,
    )
    const previousReviews = await service.listReviews({ id: input.ids })
    const updateFromSnapshot = async (snapshot: typeof previousReviews) => ({
      previousReviews: snapshot,
      reviews: await service.updateReviews(
        input.ids.map((id) => ({
          id,
          status: input.status,
        })),
      ),
    })
    const snapshotUpdate = await updateFromSnapshot(previousReviews)

    return new StepResponse(
      snapshotUpdate.reviews,
      snapshotUpdate.previousReviews,
    )
  },
  async (previousReviews, { container }) => {
    if (previousReviews === undefined || previousReviews.length === 0) {
      return
    }

    await container
      .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .updateReviews(previousReviews)
  },
)
