import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import type { AdminGetQuoteParamsType } from "../validators"

const getQuote = async (
  req: AuthenticatedMedusaRequest<AdminGetQuoteParamsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  if (id === undefined || id.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The id path parameter is required",
    )
  }

  const queryResult: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const data: unknown = isRecord(queryResult)
    ? getRecordValue(queryResult, "data")
    : undefined
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Invalid quote graph response for id "${id}"`,
    )
  }
  const quote: unknown = data[0]

  res.json({ quote })
}

export { getQuote as GET }
