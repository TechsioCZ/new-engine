import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requirePathParam } from "../../../../../utils/path-params"
import { customerRejectQuoteWorkflow } from "../../../../../workflows/quote/workflows/customer-reject-quote"
import type { RejectQuoteType } from "../../validators"

const post = async (
  req: AuthenticatedMedusaRequest<RejectQuoteType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Quote id")

  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY,
  )

  await customerRejectQuoteWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      quote_id: id,
      ...req.validatedBody,
    },
  })

  const queryResult = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { customer_id: req.auth_context.actor_id, id },
    },
    { throwIfKeyNotFound: true },
  )
  const [quote] = queryResult.data

  return res.json({ quote: quote ?? null })
}

export { post as POST }
