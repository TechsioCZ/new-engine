import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { merchantSendQuoteWorkflow } from "../../../../../workflows/quote/workflows"
import type { AdminSendQuoteType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminSendQuoteType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = req.params.id

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Quote id is required"
    )
  }

  await merchantSendQuoteWorkflow(req.scope).run({
    input: {
      quote_id: id,
      ...req.validatedBody,
    },
  })

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ quote })
}
