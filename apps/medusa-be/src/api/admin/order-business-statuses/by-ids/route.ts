import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  parseOrderBusinessStatusOrders,
  toOrderBusinessStatusSummary,
} from "../utils"
import type { GetAdminOrderBusinessStatusesByIdsSchemaType } from "../validators"

export async function GET(
  req: MedusaRequest<unknown, GetAdminOrderBusinessStatusesByIdsSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { ids } = req.validatedQuery

  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    filters: {
      id: ids,
    },
  })

  res.json({
    orders: parseOrderBusinessStatusOrders(data).map(
      toOrderBusinessStatusSummary
    ),
  })
}
