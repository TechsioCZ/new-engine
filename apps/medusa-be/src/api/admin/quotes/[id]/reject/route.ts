import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { merchantRejectQuoteWorkflow } from "../../../../../workflows/quote/workflows/merchant-reject-quote"
import type { AdminRejectQuoteType } from "../../validators"

const post = async (
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

  const graphResult: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const data: unknown = isRecord(graphResult)
    ? getRecordValue(graphResult, "data")
    : undefined
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Quote query returned an invalid response",
    )
  }
  const quote: unknown = data[0]
  if (!isRecord(quote)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Quote with id "${id}" was not found`,
    )
  }

  res.json({ quote })
}

export { post as POST }
