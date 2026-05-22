import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processCustomerGroupsBatchStep } from "./steps/process-batch"
import type {
  UpsertCustomerGroupsBatchInput,
  UpsertCustomerGroupsBatchOutput,
} from "./types"

export const upsertCustomerGroupsBatchWorkflow = createWorkflow(
  "symmy-upsert-customer-groups-batch",
  (input: UpsertCustomerGroupsBatchInput) => {
    const result = processCustomerGroupsBatchStep(input)
    return new WorkflowResponse<UpsertCustomerGroupsBatchOutput>(result)
  }
)
