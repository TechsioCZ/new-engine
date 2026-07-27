import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { symmyProcessTrackingBatchStep } from "./steps/process-batch"
import type { AddTrackingBatchInput, AddTrackingBatchOutput } from "./types"

const symmyAddTrackingBatchWorkflow = createWorkflow(
  "symmy-add-tracking-batch",
  (input: AddTrackingBatchInput) => {
    const result = symmyProcessTrackingBatchStep(input)
    return new WorkflowResponse<AddTrackingBatchOutput>(result)
  }
)

export { symmyAddTrackingBatchWorkflow as addTrackingBatchWorkflow }
