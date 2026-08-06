import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type {
  IOrderModuleService,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const quoteSchema = z.looseObject({ draft_order_id: z.string().min(1) })
const quoteQuerySchema = z.object({ data: z.array(quoteSchema) })

const getQuotePreview = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const { id } = req.params

  if (id === undefined || id.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The id path parameter is required",
    )
  }

  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY,
  )

  const queryResult: unknown = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { customer_id: req.auth_context.actor_id, id },
    },
    { throwIfKeyNotFound: true },
  )
  const [quote] = quoteQuerySchema.parse(queryResult).data

  if (quote === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Quote ${id} was not found`,
    )
  }

  const orderModuleService: IOrderModuleService = req.scope.resolve(
    Modules.ORDER,
  )

  const preview = await orderModuleService.previewOrderChange(
    quote.draft_order_id,
  )

  res.status(200).json({
    quote: {
      ...quote,
      order_preview: preview,
    },
  })
}

export { getQuotePreview as GET }
