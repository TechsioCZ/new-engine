import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import { createRequestForQuoteWorkflow } from "../../../workflows/quote/workflows/create-request-for-quote"
import type { CreateQuoteType, GetQuoteParamsType } from "./validators"

const getRoute = async (
  req: AuthenticatedMedusaRequest<GetQuoteParamsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY,
  )

  const { fields, pagination } = req.queryConfig
  const skip = pagination.skip ?? 0
  const { data: quotes, metadata } = await query.graph({
    entity: "quote",
    fields,
    filters: {
      customer_id: req.auth_context.actor_id,
    },
    pagination: {
      ...pagination,
      skip,
    },
  })

  res.json({
    count: metadata?.count ?? 0,
    limit: metadata?.take ?? pagination.take,
    offset: metadata?.skip ?? skip,
    quotes,
  })
}

const postRoute = async (
  req: AuthenticatedMedusaRequest<CreateQuoteType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY,
  )

  const {
    result: { quote: createdQuote },
  } = await createRequestForQuoteWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
    },
  })

  if (!createdQuote) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to create quote",
    )
  }

  const quoteGraphResult: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id: createdQuote.id },
    },
    { throwIfKeyNotFound: true },
  )

  const quoteData: unknown = isRecord(quoteGraphResult)
    ? getRecordValue(quoteGraphResult, "data")
    : undefined
  if (!Array.isArray(quoteData)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Quote query returned an invalid result",
    )
  }

  const records: unknown[] = quoteData
  const [quote] = records
  return res.json({ quote })
}

export { getRoute as GET, postRoute as POST }
