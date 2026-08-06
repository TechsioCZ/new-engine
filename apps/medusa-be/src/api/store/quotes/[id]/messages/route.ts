import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { omitUndefined } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { createQuoteMessageWorkflow } from "../../../../../workflows/quote/workflows/create-quote-message"
import type { StoreCreateQuoteMessageType } from "../../validators"

const post = async (
  req: AuthenticatedMedusaRequest<StoreCreateQuoteMessageType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Quote id")

  await createQuoteMessageWorkflow(req.scope).run({
    input: omitUndefined({
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
      quote_id: id,
    }),
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

  res.json({ quote })
}

export { post as POST }
