import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { reactivateCustomerAccountStep } from "../steps/reactivate-customer-account"

type ReactivateCustomerAccountWorkflowInput = {
  auth_identity_id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

export const reactivateCustomerAccountWorkflow = createWorkflow(
  "reactivate-customer-account",
  (input: ReactivateCustomerAccountWorkflowInput) => {
    const reactivated = reactivateCustomerAccountStep(input)

    return new WorkflowResponse(reactivated)
  }
)
