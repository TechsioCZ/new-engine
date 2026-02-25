import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import type { ModuleQuote, ModuleUpdateQuote } from "../../../types"
import { updateQuotesStep } from "../steps/update-quotes"

/*
  A workflow that updates a quote. 
*/
export const updateQuotesWorkflow = createWorkflow(
  "update-quotes-workflow",
  (input: ModuleUpdateQuote[]): WorkflowResponse<ModuleQuote[]> =>
    new WorkflowResponse(updateQuotesStep(input))
)
