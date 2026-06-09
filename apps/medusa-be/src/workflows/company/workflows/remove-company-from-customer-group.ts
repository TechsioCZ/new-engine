import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { removeCompanyCustomerGroupLinkStep } from "../steps"

export const removeCompanyFromCustomerGroupWorkflow = createWorkflow(
  "remove-company-from-customer-group",
  (input: { company_id: string; group_id: string }) => {
    removeCompanyCustomerGroupLinkStep({
      company_id: input.company_id,
      expected_group_id: input.group_id,
    })

    return new WorkflowResponse(input)
  }
)
