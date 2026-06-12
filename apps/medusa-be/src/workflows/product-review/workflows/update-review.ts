import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateReviewStep } from "../steps/update-review"
import type { UpdateReviewWorkflowInput } from "../types"

export const updateReviewWorkflow = createWorkflow(
  "update-product-review-workflow",
  (input: UpdateReviewWorkflowInput) => {
    const review = updateReviewStep(input)

    return new WorkflowResponse(review)
  }
)
