import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

const quoteAcceptanceSchema = z.object({
  draft_order_id: z.string().min(1),
  status: z.string(),
})

export const validateQuoteAcceptanceStep = createStep(
  "validate-quote-acceptance",
  ({ quote }: { quote: unknown }) => {
    const parsedQuote = quoteAcceptanceSchema.safeParse(quote)
    if (!parsedQuote.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Quote query returned an invalid result",
      )
    }

    if (parsedQuote.data.status !== "pending_customer") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot accept quote when quote status is ${parsedQuote.data.status}`,
      )
    }

    return new StepResponse({ draft_order_id: parsedQuote.data.draft_order_id })
  },
)
