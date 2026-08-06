import {
  setAuthAppMetadataStep,
  updateCustomersWorkflow,
} from "@medusajs/core-flows"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { prepareCustomerAccountReactivationStep } from "../steps/create-or-reactivate-customer-account"

type CreateOrReactivateCustomerAccountWorkflowInput = {
  auth_identity_id: string
  company_name?: string | null
  email: string
  first_name?: string | null
  last_name?: string | null
  metadata?: Record<string, unknown> | null
  phone?: string | null
}

export const createOrReactivateCustomerAccountWorkflow = createWorkflow(
  "create-or-reactivate-customer-account",
  (input: CreateOrReactivateCustomerAccountWorkflowInput) => {
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

    const reactivatedCustomer = transform(
      { updatedCustomers },
      ({ updatedCustomers: customers }) => customers.at(0)
    )

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
