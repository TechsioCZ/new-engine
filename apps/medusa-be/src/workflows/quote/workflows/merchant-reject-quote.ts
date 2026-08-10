import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"

import { validateQuoteRejectionStep } from "../steps/validate-quote-rejection"
import { updateQuotesWorkflow } from "./update-quote"

const getQuoteForRejectionStep = createStep(
  "get-quote-for-rejection",
  async (input: { quote_id: string }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "quote",
      fields: ["id", "status"],
      filters: { id: input.quote_id },
      pagination: { take: 1 },
    })
    const [quote] = data

    if (quote === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Quote ${input.quote_id} was not found`,
      )
    }

    return new StepResponse({ id: quote.id, status: quote.status })
  },
)

/*
  A workflow that rejects a quote by a merchant.

  Once the merchant rejects the quote, we update the status of the quote to a rejection by merchant.
*/
export const merchantRejectQuoteWorkflow = createWorkflow(
  "merchant-reject-quote",
  (input: { quote_id: string }) => {
    const quote = getQuoteForRejectionStep(input)

    validateQuoteRejectionStep({ quote })

    updateQuotesWorkflow.runAsStep({
      input: [
        {
          id: input.quote_id,
          status: "merchant_rejected",
        },
      ],
    })
  },
)
