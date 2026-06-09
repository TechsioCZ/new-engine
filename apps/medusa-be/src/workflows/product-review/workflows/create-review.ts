import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createReviewStep } from "../steps/create-review"
import type { CreateReviewWorkflowInput } from "../types"

export const createReviewWorkflow = createWorkflow(
  "create-product-review-workflow",
  (input: CreateReviewWorkflowInput) =>
    new WorkflowResponse(createReviewStep(input))
)
