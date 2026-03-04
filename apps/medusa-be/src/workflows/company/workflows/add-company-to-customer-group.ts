/* istanbul ignore file */
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import { addCompanyEmployeesToCustomerGroupStep } from "../steps/add-company-employees-to-customer-group"

export const addCompanyToCustomerGroupWorkflow = createWorkflow(
  "add-company-to-customer-group",
  (input: { company_id: string; group_id: string }) => {
    createRemoteLinkStep([
      {
        [COMPANY_MODULE]: {
          company_id: input.company_id,
        },
        [Modules.CUSTOMER]: {
          customer_group_id: input.group_id,
        },
      },
    ])

    addCompanyEmployeesToCustomerGroupStep({
      company_id: input.company_id,
    })

    return new WorkflowResponse(input)
  }
)
