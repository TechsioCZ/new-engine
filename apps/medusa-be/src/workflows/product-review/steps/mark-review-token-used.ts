import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"
import type { CreateReviewWorkflowInput } from "../types"

type ProductReviewModuleServiceWithTokens = ProductReviewModuleService & {
  updateReviewTokens: (
    data: { id: string; used_at: Date | null }[]
  ) => Promise<unknown>
}

export const markReviewTokenUsedStep = createStep(
  "mark-review-token-used",
  async (input: CreateReviewWorkflowInput, { container }) => {
    if (!input.review_token_id) {
      return new StepResponse({ updated: false }, null)
    }

    const service = container.resolve<ProductReviewModuleServiceWithTokens>(
      PRODUCT_REVIEW_MODULE
    )

    await service.updateReviewTokens([
      {
        id: input.review_token_id,
        used_at: new Date(),
      },
    ])

    return new StepResponse({ updated: true }, input.review_token_id)
  },
  async (reviewTokenId, { container }) => {
    if (!reviewTokenId) {
      return
    }

    await container
      .resolve<ProductReviewModuleServiceWithTokens>(PRODUCT_REVIEW_MODULE)
      .updateReviewTokens([
        {
          id: reviewTokenId,
          used_at: null,
        },
      ])
  }
)
