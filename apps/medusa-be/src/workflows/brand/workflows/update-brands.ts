import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateBrandsStep } from "../steps"
import type { UpdateBrandsWorkflowInput } from "../types"

export const updateBrandsWorkflow = createWorkflow(
  "update-brands-workflow",
  (input: UpdateBrandsWorkflowInput) =>
    new WorkflowResponse(updateBrandsStep(input))
)
