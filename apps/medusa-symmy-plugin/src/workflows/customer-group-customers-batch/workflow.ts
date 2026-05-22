import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processCustomerGroupCustomersBatchStep } from "./steps/process-batch"
import type {
  AssignCustomersToGroupBatchInput,
  AssignCustomersToGroupBatchOutput,
} from "./types"

export const assignCustomersToGroupBatchWorkflow = createWorkflow(
  "symmy-assign-customers-to-group-batch",
  (input: AssignCustomersToGroupBatchInput) => {
    const result = processCustomerGroupCustomersBatchStep(input)
    return new WorkflowResponse<AssignCustomersToGroupBatchOutput>(result)
  }
)
