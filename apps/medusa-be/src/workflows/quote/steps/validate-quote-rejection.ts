import { MedusaError } from "@medusajs/framework/utils"
import { createStep } from "@medusajs/framework/workflows-sdk"

interface QuoteRejectionCandidate {
  id: string
  status: string
}

export const validateQuoteRejectionStep = createStep(
  "validate-quote-rejection",
  ({ quote }: { quote: QuoteRejectionCandidate }) => {
    if (["accepted"].includes(quote.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Quote is already accepted by customer",
      )
    }
  },
)
