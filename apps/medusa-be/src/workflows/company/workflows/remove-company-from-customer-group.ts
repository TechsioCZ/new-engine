import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { removeCompanyCustomerGroupLinkStep } from "../steps/remove-company-customer-group-link"
import { validateCompanyActiveStep } from "../steps/validate-company-active"

export const removeCompanyFromCustomerGroupWorkflow = createWorkflow(
  "remove-company-from-customer-group",
  (input: { company_id: string; group_id: string }) => {
    validateCompanyActiveStep(input.company_id)

    removeCompanyCustomerGroupLinkStep({
      company_id: input.company_id,
      expected_group_id: input.group_id,
    })

    return new WorkflowResponse(input)
  },
)
