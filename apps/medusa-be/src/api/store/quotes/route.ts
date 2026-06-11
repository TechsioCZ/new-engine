import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createRequestForQuoteWorkflow } from "../../../workflows/quote/workflows/create-request-for-quote"
import type { CreateQuoteType, GetQuoteParamsType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<GetQuoteParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
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
    quotes,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? skip,
    limit: metadata?.take ?? pagination.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateQuoteType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
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
    throw new Error("Failed to create quote")
  }

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id: createdQuote.id },
    },
    { throwIfKeyNotFound: true }
  )

  return res.json({ quote })
}
