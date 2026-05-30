import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processTrackingBatchStep } from "./steps/process-batch"
import type { AddTrackingBatchInput, AddTrackingBatchOutput } from "./types"

export const addTrackingBatchWorkflow = createWorkflow(
  "symmy-add-tracking-batch",
  (input: AddTrackingBatchInput) => {
    const result = processTrackingBatchStep(input)
    return new WorkflowResponse<AddTrackingBatchOutput>(result)
  }
)
