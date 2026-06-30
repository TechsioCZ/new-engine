import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { restoreBrandsStep } from "../steps"
import type { RestoreBrandsWorkflowInput } from "../types"

export const restoreBrandsWorkflow = createWorkflow(
  "restore-brands-workflow",
  (input: RestoreBrandsWorkflowInput) =>
    new WorkflowResponse(restoreBrandsStep(input))
)
