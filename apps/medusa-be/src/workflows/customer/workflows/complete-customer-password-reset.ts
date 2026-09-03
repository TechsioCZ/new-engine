import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type CompleteCustomerPasswordResetInput,
  completeCustomerPasswordResetStep,
} from "../steps/complete-customer-password-reset"

export const completeCustomerPasswordResetWorkflow = createWorkflow(
  "complete-customer-password-reset",
  (input: CompleteCustomerPasswordResetInput) => {
    const updated = completeCustomerPasswordResetStep(input)

    return new WorkflowResponse(updated)
  }
)
