import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateReviewStatusStep } from "../steps/update-review-status"
import type { UpdateReviewStatusWorkflowInput } from "../types"

export const updateReviewStatusWorkflow = createWorkflow(
  "update-product-review-status-workflow",
  (input: UpdateReviewStatusWorkflowInput) => {
    const reviews = updateReviewStatusStep(input)

    return new WorkflowResponse(reviews)
  }
)
