import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { restoreProducersStep } from "../steps"
import type { RestoreProducersWorkflowInput } from "../types"

export const restoreProducersWorkflow = createWorkflow(
  "restore-producers-workflow",
  (input: RestoreProducersWorkflowInput) =>
    new WorkflowResponse(restoreProducersStep(input))
)
