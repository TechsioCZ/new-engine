import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type InvalidateCmsContentStepInput,
  invalidateCmsContentStep,
} from "../steps/invalidate-cms-content"

export const invalidateCmsContentWorkflow = createWorkflow(
  "invalidate-cms-content",
  (input: InvalidateCmsContentStepInput) =>
    new WorkflowResponse(invalidateCmsContentStep(input))
)
