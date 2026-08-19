import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import type { ImportReviewsWorkflowInput } from "../types"

export const createImportedReviewsStep = createStep(
  "create-imported-reviews",
  async (input: ImportReviewsWorkflowInput, { container }) => {
    const service = container.resolve<ProductReviewModuleService>(
      PRODUCT_REVIEW_MODULE
    )
    const reviews = await service.createReviews(input.reviews)

    return new StepResponse(
      reviews,
      reviews.map((review) => review.id)
    )
  },
  async (reviewIds, { container }) => {
    if (!reviewIds?.length) {
      return
    }

    await container
      .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
      .deleteReviews(reviewIds)
  }
)
