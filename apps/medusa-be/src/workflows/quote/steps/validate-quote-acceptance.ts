import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

export const validateQuoteAcceptanceStep = createStep(
  "validate-quote-acceptance",
  ({ quote }: { quote: unknown }) => {
    if (
      !isRecord(quote) ||
      typeof quote["draft_order_id"] !== "string" ||
      quote["draft_order_id"] === "" ||
      typeof quote["status"] !== "string"
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Quote query returned an invalid result",
      )
    }

    if (quote["status"] !== "pending_customer") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot accept quote when quote status is ${quote["status"]}`,
      )
    }

    return new StepResponse({ draft_order_id: quote["draft_order_id"] })
  },
)
