import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import type { UpdateReviewWorkflowInput } from "../types"

export const updateReviewStep = createStep(
  "update-product-review",
  async (input: UpdateReviewWorkflowInput, { container }) => {
    const service = container.resolve<ProductReviewModuleService>(
      PRODUCT_REVIEW_MODULE
    )
    const previousReview = await service.retrieveReview(input.id)
    const review = await service.updateReviews({
      id: input.id,
      ...input.review,
    })

    return new StepResponse(review, previousReview)
  },
  async (previousReview, { container }) => {
    if (!previousReview) {
      return
    }

    await container
      .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .updateReviews(previousReview)
  }
)
