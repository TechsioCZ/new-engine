import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteProducersStep } from "../steps"
import type { DeleteProducersWorkflowInput } from "../types"

export const deleteProducersWorkflow = createWorkflow(
  "delete-producers-workflow",
  (input: DeleteProducersWorkflowInput) =>
    new WorkflowResponse(deleteProducersStep(input))
)
