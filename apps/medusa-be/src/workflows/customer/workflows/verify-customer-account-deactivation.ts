import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { verifyCustomerAccountDeactivationTokenStep } from "../steps/verify-customer-account-deactivation-token"

interface VerifyCustomerAccountDeactivationWorkflowInput {
  token: string
}

export const verifyCustomerAccountDeactivationWorkflow = createWorkflow(
  "verify-customer-account-deactivation",
  (input: VerifyCustomerAccountDeactivationWorkflowInput) => {
    const verified = verifyCustomerAccountDeactivationTokenStep(input)

    return new WorkflowResponse(verified)
  },
)
