import { OrderStatus } from "@medusajs/framework/utils"
import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  confirmOrderEditRequestWorkflow,
  useRemoteQueryStep,
} from "@medusajs/medusa/core-flows"

import { updateOrderWorkflow } from "../../order/workflows/update-order"
import { validateQuoteAcceptanceStep } from "../steps/validate-quote-acceptance"
import { updateQuotesWorkflow } from "./update-quote"

/*
  A workflow that accepts a quote by a customer. 
  
  Once the customer accepts the quote, any staged changes made on the draft order is then committed.
  The draft order is then converted to an actual order ready for processing.
*/
export const customerAcceptQuoteWorkflow = createWorkflow(
  "customer-accept-quote",
  (input: { quote_id: string; customer_id: string }) => {
    const quote = useRemoteQueryStep({
      entry_point: "quote",
      fields: ["id", "customer_id", "draft_order_id", "status"],
      list: false,
      throw_if_key_not_found: true,
      variables: { customer_id: input.customer_id, id: input.quote_id },
    })

    validateQuoteAcceptanceStep({ quote })

    updateQuotesWorkflow.runAsStep({
      input: [{ id: input.quote_id, status: "accepted" }],
    })

    confirmOrderEditRequestWorkflow.runAsStep({
      input: {
        confirmed_by: input.customer_id,
        order_id: quote.draft_order_id,
      },
    })

    updateOrderWorkflow.runAsStep({
      input: {
        id: quote.draft_order_id,
        is_draft_order: false,
        status: OrderStatus.PENDING,
      },
    })
  },
)
