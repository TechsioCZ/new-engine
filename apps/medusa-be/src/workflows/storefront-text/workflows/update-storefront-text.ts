import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateStorefrontTextStep } from "../steps/update-storefront-text"
import type { UpdateStorefrontTextWorkflowInput } from "../types"

export const updateStorefrontTextWorkflow = createWorkflow(
  "update-storefront-text-workflow",
  (input: UpdateStorefrontTextWorkflowInput) =>
    new WorkflowResponse(updateStorefrontTextStep(input))
)
