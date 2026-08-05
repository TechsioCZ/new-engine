import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { symmyProcessProductsBatchStep } from "./steps/process-batch"
import type {
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
} from "./types"

const symmyUpsertProductsBatchWorkflow = createWorkflow(
  "symmy-upsert-products-batch",
  (input: UpsertProductsBatchInput) => {
    const result = symmyProcessProductsBatchStep(input)
    return new WorkflowResponse<UpsertProductsBatchOutput>(result)
  },
)

export { symmyUpsertProductsBatchWorkflow as upsertProductsBatchWorkflow }
