import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { requirePathParam } from "../../../../../utils/path-params"
import { customerAcceptQuoteWorkflow } from "../../../../../workflows/quote/workflows/customer-accept-quote"
import type { AcceptQuoteType } from "../../validators"

const post = async (
  req: AuthenticatedMedusaRequest<AcceptQuoteType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Quote id")

  await customerAcceptQuoteWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
      quote_id: id,
    },
  })

  const { data } = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { customer_id: req.auth_context.actor_id, id },
    },
    { throwIfKeyNotFound: true },
  )
  const quote = z
    .array(z.object({ id: z.string() }).loose())
    .parse(data)
    .at(0)

  return res.json({ quote })
}

export { post as POST }
