import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createImportedReviewsStep } from "../steps/create-imported-reviews"
import type { ImportReviewsWorkflowInput } from "../types"

export const importReviewsWorkflow = createWorkflow(
  "import-reviews",
  (input: ImportReviewsWorkflowInput) =>
    new WorkflowResponse(createImportedReviewsStep(input))
)
