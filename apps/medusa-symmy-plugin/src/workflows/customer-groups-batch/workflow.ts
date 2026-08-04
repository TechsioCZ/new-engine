import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { symmyProcessCustomerGroupsBatchStep } from "./steps/process-batch"
import type {
  UpsertCustomerGroupsBatchInput,
  UpsertCustomerGroupsBatchOutput,
} from "./types"

const symmyUpsertCustomerGroupsBatchWorkflow = createWorkflow(
  "symmy-upsert-customer-groups-batch",
  (input: UpsertCustomerGroupsBatchInput) => {
    const result = symmyProcessCustomerGroupsBatchStep(input)
    return new WorkflowResponse<UpsertCustomerGroupsBatchOutput>(result)
  }
)

export { symmyUpsertCustomerGroupsBatchWorkflow as upsertCustomerGroupsBatchWorkflow }
