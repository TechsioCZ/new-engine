import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  setCompanyCustomerGroupStep,
  validateCompanyActiveStep,
} from "../steps"

export const addCompanyToCustomerGroupWorkflow = createWorkflow(
  "add-company-to-customer-group",
  (input: { company_id: string; group_id: string }) => {
    validateCompanyActiveStep(input.company_id)

    setCompanyCustomerGroupStep({
      company_id: input.company_id,
      group_id: input.group_id,
    })

    return new WorkflowResponse(input)
  }
)
