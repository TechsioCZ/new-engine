import type { MetadataType } from "@medusajs/framework/types"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  setAuthAppMetadataStep,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"

import { ensureReactivatedCustomerStep } from "../steps/ensure-reactivated-customer"
import { markCustomerAccountActiveStep } from "../steps/mark-customer-account-active"
import { prepareCustomerAccountReactivationStep } from "../steps/prepare-customer-account-reactivation"
import type { CustomerRecord } from "../steps/prepare-customer-account-reactivation"
import { restoreCustomerAccountStep } from "../steps/restore-customer-account"

interface ReactivateCustomerAccountWorkflowInput {
  auth_identity_id: string
  company_name?: string | null
  customer: CustomerRecord
  email: string
  first_name?: string | null
  last_name?: string | null
  metadata?: MetadataType
  phone?: string | null
}

export const reactivateCustomerAccountWorkflow = createWorkflow(
  "reactivate-customer-account",
  (input: ReactivateCustomerAccountWorkflowInput) => {
    const prepared = prepareCustomerAccountReactivationStep(input)

    const restored = restoreCustomerAccountStep(
      transform({ prepared }, ({ prepared: data }) => ({
        customer_id: data.customer_id,
        was_soft_deleted: data.was_soft_deleted,
      })),
    )

    const updatedCustomers = updateCustomersWorkflow.runAsStep({
      input: transform({ prepared, restored }, ({ prepared: data }) => ({
        selector: {
          id: [data.customer_id],
        },
        update: data.update,
      })),
    })

    const activeCustomer = markCustomerAccountActiveStep(
      transform({ prepared, updatedCustomers }, ({ prepared: data }) => ({
        customer_id: data.customer_id,
      })),
    )

    setAuthAppMetadataStep(
      transform({ activeCustomer, prepared }, ({ prepared: data }) => ({
        actorType: "customer",
        authIdentityId: data.auth_identity_id,
        value: data.customer_id,
      })),
    )

    const reactivatedCustomer = ensureReactivatedCustomerStep(updatedCustomers)

    return new WorkflowResponse(
      transform(
        { reactivatedCustomer },
        ({ reactivatedCustomer: customer }) => ({
          customer,
          reactivated: true,
        }),
      ),
    )
  },
)
