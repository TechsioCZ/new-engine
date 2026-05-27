import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processCustomersBatchStep } from "./steps/process-batch"
import type {
  UpsertCustomersBatchInput,
  UpsertCustomersBatchOutput,
} from "./types"

export const upsertCustomersBatchWorkflow = createWorkflow(
  "symmy-upsert-customers-batch",
  (input: UpsertCustomersBatchInput) => {
    const result = processCustomersBatchStep(input)
    return new WorkflowResponse<UpsertCustomersBatchOutput>(result)
  }
)
