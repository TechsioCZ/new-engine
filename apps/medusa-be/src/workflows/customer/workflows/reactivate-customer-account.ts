import {
  setAuthAppMetadataStep,
  updateCustomersWorkflow,
} from "@medusajs/core-flows"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ensureReactivatedCustomerStep } from "../steps/ensure-reactivated-customer"
import {
  type CustomerRecord,
  prepareCustomerAccountReactivationStep,
} from "../steps/prepare-customer-account-reactivation"

type ReactivateCustomerAccountWorkflowInput = {
  auth_identity_id: string
  company_name?: string | null
  customer: CustomerRecord
  email: string
  first_name?: string | null
  last_name?: string | null
  metadata?: Record<string, unknown> | null
  phone?: string | null
}

export const reactivateCustomerAccountWorkflow = createWorkflow(
  "reactivate-customer-account",
  (input: ReactivateCustomerAccountWorkflowInput) => {
    const prepared = prepareCustomerAccountReactivationStep(input)

    const updatedCustomers = updateCustomersWorkflow.runAsStep({
      input: transform({ prepared }, ({ prepared: data }) => ({
        selector: {
          id: [data.customer_id],
        },
        update: data.update,
      })),
    })

    setAuthAppMetadataStep(
      transform({ prepared, updatedCustomers }, ({ prepared: data }) => ({
        actorType: "customer",
        authIdentityId: data.auth_identity_id,
        value: data.customer_id,
      }))
    )

    const reactivatedCustomer = ensureReactivatedCustomerStep(updatedCustomers)

    return new WorkflowResponse(
      transform(
        { reactivatedCustomer },
        ({ reactivatedCustomer: customer }) => ({
          customer,
          reactivated: true,
        })
      )
    )
  }
)
