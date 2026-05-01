import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processStockBatchStep } from "./steps/process-batch"
import type { UpdateStockBatchInput, UpdateStockBatchOutput } from "./types"

export const updateStockBatchWorkflow = createWorkflow(
  "symmy-update-stock-batch",
  (input: UpdateStockBatchInput) => {
    const result = processStockBatchStep(input)
    return new WorkflowResponse<UpdateStockBatchOutput>(result)
  }
)
