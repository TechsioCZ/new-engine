import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { symmyProcessCustomersBatchStep } from "./steps/process-batch"
import type {
  UpsertCustomersBatchInput,
  UpsertCustomersBatchOutput,
} from "./types"

const symmyUpsertCustomersBatchWorkflow = createWorkflow(
  "symmy-upsert-customers-batch",
  (input: UpsertCustomersBatchInput) => {
    const result = symmyProcessCustomersBatchStep(input)
    return new WorkflowResponse<UpsertCustomersBatchOutput>(result)
  }
)

export { symmyUpsertCustomersBatchWorkflow as upsertCustomersBatchWorkflow }
