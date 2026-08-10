import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import type { GetQuoteParamsType } from "../validators"

const getQuoteFromGraphResult = (result: unknown): object | undefined => {
  const data: unknown = isRecord(result)
    ? getRecordValue(result, "data")
    : undefined
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Quote query returned an invalid data payload",
    )
  }

  const records: unknown[] = data
  const [quote] = records
  if (quote === undefined) {
    return undefined
  }
  if (!isRecord(quote)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Quote query returned a non-object quote",
    )
  }

  return quote
}

const getQuote = async (
  req: AuthenticatedMedusaRequest<GetQuoteParamsType>,
  res: MedusaResponse,
) => {
  const { id } = req.params

  if (id === undefined || id.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The id path parameter is required",
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const result: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: {
        customer_id: req.auth_context.actor_id,
        id,
      },
    },
    { throwIfKeyNotFound: true },
  )
  const quote = getQuoteFromGraphResult(result)

  res.json({ quote })
}

export { getQuote as GET }
