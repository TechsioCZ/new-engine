import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setCompanyCustomerGroupStep } from "../steps"

export const addCompanyToCustomerGroupWorkflow = createWorkflow(
  "add-company-to-customer-group",
  (input: { company_id: string; group_id: string }) => {
    setCompanyCustomerGroupStep({
      company_id: input.company_id,
      group_id: input.group_id,
    })

    return new WorkflowResponse(input)
  }
)
