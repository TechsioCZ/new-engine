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

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The id path parameter is required"
    )
  }

  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  )

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id, customer_id: req.auth_context.actor_id },
    },
    { throwIfKeyNotFound: true }
  )

  if (!quote) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Quote ${id} was not found`
    )
  }

  const orderModuleService: IOrderModuleService = req.scope.resolve(
    Modules.ORDER
  )

  const preview = await orderModuleService.previewOrderChange(
    quote.draft_order_id
  )

  res.status(200).json({
    quote: {
      ...quote,
      order_preview: preview,
    },
  })
}
