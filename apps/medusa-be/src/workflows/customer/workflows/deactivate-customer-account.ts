import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteAuthIdentityStep } from "../steps/delete-auth-identity"
import { prepareCustomerAccountDeactivationStep } from "../steps/prepare-customer-account-deactivation"
import { softDeleteCustomerStep } from "../steps/soft-delete-customer"

type DeactivateCustomerAccountWorkflowInput = {
  customer_id: string
}

export const deactivateCustomerAccountWorkflow = createWorkflow(
  "deactivate-customer-account",
  function (input: DeactivateCustomerAccountWorkflowInput) {
    const prepared = prepareCustomerAccountDeactivationStep(input)

    softDeleteCustomerStep(
      transform({ prepared }, ({ prepared: payload }) => ({
        customer_id: payload.customer_id,
      }))
    )

    deleteAuthIdentityStep(
      transform({ prepared }, ({ prepared: payload }) => ({
        auth_identity_id: payload.auth_identity_id,
      }))
    )

    return new WorkflowResponse(
      transform({ prepared }, ({ prepared: payload }) => ({
        customer_id: payload.customer_id,
        deleted: true,
      }))
    )
  }
)
