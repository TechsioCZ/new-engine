import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createReviewStep } from "../steps/create-review"
import { markReviewTokenUsedStep } from "../steps/mark-review-token-used"
import type { CreateReviewWorkflowInput } from "../types"

export const createReviewWorkflow = createWorkflow(
  "create-product-review-workflow",
  (input: CreateReviewWorkflowInput) => {
    const review = createReviewStep(input)
    markReviewTokenUsedStep(input)

    return new WorkflowResponse(review)
  }
)
