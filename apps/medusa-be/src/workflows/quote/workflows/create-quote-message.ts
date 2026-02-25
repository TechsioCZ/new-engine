import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import type {
  ModuleCreateQuoteMessage,
  ModuleQuoteMessage,
} from "../../../types"
import { createQuoteMessageStep } from "../steps/create-quote-message"

/*
  A workflow that creates messages within a quote. Messages are used as a communication trail
  between the merchant and the customer. The message can also hold an item_id for either of the
  actors to have a conversation around or negotiate upon.
*/
export const createQuoteMessageWorkflow = createWorkflow(
  "create-quote-message-workflow",
  (input: ModuleCreateQuoteMessage): WorkflowResponse<ModuleQuoteMessage> =>
    new WorkflowResponse(createQuoteMessageStep(input))
)
