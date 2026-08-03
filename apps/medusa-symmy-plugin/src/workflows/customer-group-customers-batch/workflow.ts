import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { symmyProcessCustomerGroupCustomersBatchStep } from "./steps/process-batch"
import type {
  AssignCustomersToGroupBatchInput,
  AssignCustomersToGroupBatchOutput,
} from "./types"

const symmyAssignCustomersToGroupBatchWorkflow = createWorkflow(
  "symmy-assign-customers-to-group-batch",
  (input: AssignCustomersToGroupBatchInput) => {
    const result = symmyProcessCustomerGroupCustomersBatchStep(input)
    return new WorkflowResponse<AssignCustomersToGroupBatchOutput>(result)
  }
)

export { symmyAssignCustomersToGroupBatchWorkflow as assignCustomersToGroupBatchWorkflow }
