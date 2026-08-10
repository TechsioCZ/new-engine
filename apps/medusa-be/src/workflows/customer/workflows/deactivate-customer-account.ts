import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { markCustomerAccountInactiveStep } from "../steps/mark-customer-account-inactive"
import { prepareCustomerAccountDeactivationStep } from "../steps/prepare-customer-account-deactivation"

interface DeactivateCustomerAccountWorkflowInput {
  customer_id: string
  deactivation_nonce: string
}

export const deactivateCustomerAccountWorkflow = createWorkflow(
  "deactivate-customer-account",
  (input: DeactivateCustomerAccountWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `customer-account-deactivation:${workflowInput.customer_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const prepared = prepareCustomerAccountDeactivationStep(input)

    const inactiveMarker = markCustomerAccountInactiveStep(
      transform({ prepared }, ({ prepared: payload }) => ({
        customer_id: payload.customer_id,
        first_name: payload.first_name,
        metadata: payload.metadata,
        previous_metadata: payload.previous_metadata,
      })),
    )

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(
      transform({ inactiveMarker, prepared }, ({ prepared: payload }) => ({
        auth_identity_deleted: false,
        customer_id: payload.customer_id,
        deleted: true,
      })),
    )
  },
)
