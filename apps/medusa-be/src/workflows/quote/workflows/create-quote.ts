import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import type { ModuleCreateQuote, ModuleQuote } from "../../../types"
import { createQuotesStep } from "../steps/create-quotes"

/*
  A workflow that creates a quote entity that manages the quote lifecycle.
*/
export const createQuotesWorkflow = createWorkflow(
  "create-quotes-workflow",
  (input: ModuleCreateQuote[]): WorkflowResponse<ModuleQuote[]> =>
    new WorkflowResponse(createQuotesStep(input))
)
