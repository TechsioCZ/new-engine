import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteBrandsStep } from "../steps"
import type { DeleteBrandsWorkflowInput } from "../types"

export const deleteBrandsWorkflow = createWorkflow(
  "delete-brands-workflow",
  (input: DeleteBrandsWorkflowInput) =>
    new WorkflowResponse(deleteBrandsStep(input))
)
