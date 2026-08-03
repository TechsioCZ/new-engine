import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { symmyProcessStockBatchStep } from "./steps/process-batch"
import type { UpdateStockBatchInput, UpdateStockBatchOutput } from "./types"

const symmyUpdateStockBatchWorkflow = createWorkflow(
  "symmy-update-stock-batch",
  (input: UpdateStockBatchInput) => {
    const result = symmyProcessStockBatchStep(input)
    return new WorkflowResponse<UpdateStockBatchOutput>(result)
  }
)

export { symmyUpdateStockBatchWorkflow as updateStockBatchWorkflow }
