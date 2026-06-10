import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import type { UpdateReviewStatusWorkflowInput } from "../types"

export const updateReviewStatusStep = createStep(
  "update-product-review-status",
  async (input: UpdateReviewStatusWorkflowInput, { container }) => {
    const service = container.resolve<ProductReviewModuleService>(
      PRODUCT_REVIEW_MODULE
    )
    const previousReviews = await service.listReviews({ id: input.ids })
    const reviews = await service.updateReviews(
      input.ids.map((id) => ({
        id,
        status: input.status,
      }))
    )

    return new StepResponse(reviews, previousReviews)
  },
  async (previousReviews, { container }) => {
    if (!previousReviews?.length) {
      return
    }

    await container
      .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .updateReviews(previousReviews)
  }
)
