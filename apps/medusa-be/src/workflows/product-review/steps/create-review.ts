import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import type { CreateReviewWorkflowInput } from "../types"

export const createReviewStep = createStep(
  "create-product-review",
  async (input: CreateReviewWorkflowInput, { container }) => {
    const service = container.resolve<ProductReviewModuleService>(
      PRODUCT_REVIEW_MODULE
    )
    const review = await service.createReviews({
      ...input.review,
      status: input.review.status ?? "pending",
    })

    return new StepResponse(review, review.id)
  },
  async (reviewId, { container }) => {
    if (!reviewId) {
      return
    }

    await container
      .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .deleteReviews([reviewId])
  }
)
