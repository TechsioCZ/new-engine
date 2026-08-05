import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requirePathParam } from "../../../../../utils/path-params"
import { merchantRejectQuoteWorkflow } from "../../../../../workflows/quote/workflows"
import type { AdminRejectQuoteType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminRejectQuoteType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Quote id")

  await merchantRejectQuoteWorkflow(req.scope).run({
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
    { throwIfKeyNotFound: true },
  )

  res.json({ quote })
}
