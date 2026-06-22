import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createBrandsStep } from "../steps"
import type { CreateBrandsWorkflowInput } from "../types"

export const createBrandsWorkflow = createWorkflow(
  "create-brands-workflow",
  (input: CreateBrandsWorkflowInput) =>
    new WorkflowResponse(createBrandsStep(input))
)
