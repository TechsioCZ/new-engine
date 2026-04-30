import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processProductsBatchStep } from "./steps"
import type { UpsertProductsBatchInput, UpsertProductsBatchOutput } from "./types"

export const upsertProductsBatchWorkflow = createWorkflow(
  "symmy-upsert-products-batch",
  (input: UpsertProductsBatchInput) => {
    const result = processProductsBatchStep(input)
    return new WorkflowResponse<UpsertProductsBatchOutput>(result)
  }
)
