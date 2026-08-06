import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  parseOrderBusinessStatusOrders,
  toOrderBusinessStatusSummary,
} from "./utils"
import type { GetAdminOrderBusinessStatusesSchemaType } from "./validators"

const get = async (
  req: MedusaRequest<unknown, GetAdminOrderBusinessStatusesSchemaType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { limit, offset } = req.validatedQuery

  const { data, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: limit,
    },
  })

  const orders = parseOrderBusinessStatusOrders(data)

  res.json({
    count: metadata?.count ?? orders.length,
    limit,
    offset,
    orders: orders.map(toOrderBusinessStatusSummary),
  })
}

export { get as GET }
