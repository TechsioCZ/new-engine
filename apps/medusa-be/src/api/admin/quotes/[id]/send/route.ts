import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { merchantSendQuoteWorkflow } from "../../../../../workflows/quote/workflows/merchant-send-quote"
import type { AdminSendQuoteType } from "../../validators"

const postHandler = async (
  req: AuthenticatedMedusaRequest<AdminSendQuoteType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Quote id")

  await merchantSendQuoteWorkflow(req.scope).run({
    input: {
      quote_id: id,
      ...req.validatedBody,
    },
  })

  const graphResult: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  if (!isRecord(graphResult) || !Array.isArray(graphResult["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Quote query returned an invalid response for ${id}`,
    )
  }
  const quote: unknown = graphResult["data"][0]

  res.json({ quote })
}

export { postHandler as POST }
