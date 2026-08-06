import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { definedProperties } from "../../../../../utils/defined-properties"
import { requirePathParam } from "../../../../../utils/path-params"
import { createQuoteMessageWorkflow } from "../../../../../workflows/quote/workflows/create-quote-message"
import type { AdminCreateQuoteMessageType } from "../../validators"

const post = async (
  req: AuthenticatedMedusaRequest<AdminCreateQuoteMessageType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Quote id")

  await createQuoteMessageWorkflow(req.scope).run({
    input: definedProperties({
      ...req.validatedBody,
      admin_id: req.auth_context.actor_id,
      quote_id: id,
    }),
  })

  const response: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const data = isRecord(response) ? response["data"] : undefined
  const quote = Array.isArray(data) && isRecord(data[0]) ? data[0] : undefined

  res.json({ quote })
}

export { post as POST }
