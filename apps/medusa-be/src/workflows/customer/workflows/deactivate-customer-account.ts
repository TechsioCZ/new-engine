import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteAuthIdentityStep } from "../steps/delete-auth-identity"
import { markCustomerAccountInactiveStep } from "../steps/mark-customer-account-inactive"
import { prepareCustomerAccountDeactivationStep } from "../steps/prepare-customer-account-deactivation"

type DeactivateCustomerAccountWorkflowInput = {
  customer_id: string
}

export const deactivateCustomerAccountWorkflow = createWorkflow(
  "deactivate-customer-account",
  (input: DeactivateCustomerAccountWorkflowInput) => {
    const prepared = prepareCustomerAccountDeactivationStep(input)

    const inactiveMarker = markCustomerAccountInactiveStep(
      transform({ prepared }, ({ prepared: payload }) => ({
        customer_id: payload.customer_id,
        first_name: payload.first_name,
      }))
    )

    const authIdentityDeletion = deleteAuthIdentityStep(
      transform({ inactiveMarker, prepared }, ({ prepared: payload }) => ({
        auth_identity_id: payload.auth_identity_id,
      }))
    )

    return new WorkflowResponse(
      transform(
        { authIdentityDeletion, prepared },
        ({
          authIdentityDeletion: authIdentityDeletionResult,
          prepared: payload,
        }) => ({
          auth_identity_deleted: authIdentityDeletionResult.deleted,
          customer_id: payload.customer_id,
          deleted: true,
        })
      )
    )
  }
)
