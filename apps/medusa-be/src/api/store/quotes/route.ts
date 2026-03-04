import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
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
  const skip = pagination.skip

  if (skip === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Quote pagination skip is required"
    )
  }

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

  if (!metadata) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Quote query metadata is missing"
    )
  }

  res.json({
    quotes,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateQuoteType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  )

  const workflowResult = await createRequestForQuoteWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
    },
  })

  const createdQuote = workflowResult.result.quote

  if (!createdQuote) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Quote creation failed"
    )
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
