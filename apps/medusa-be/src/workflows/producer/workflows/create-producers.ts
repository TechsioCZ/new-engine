import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createProducersStep } from "../steps"
import type { CreateProducersWorkflowInput } from "../types"

export const createProducersWorkflow = createWorkflow(
  "create-producers-workflow",
  (input: CreateProducersWorkflowInput) =>
    new WorkflowResponse(createProducersStep(input))
)
