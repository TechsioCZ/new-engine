import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateProducersStep } from "../steps"
import type { UpdateProducersWorkflowInput } from "../types"

export const updateProducersWorkflow = createWorkflow(
  "update-producers-workflow",
  (input: UpdateProducersWorkflowInput) =>
    new WorkflowResponse(updateProducersStep(input))
)
