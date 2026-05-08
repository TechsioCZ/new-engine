import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  type OrderBusinessStatusOrder,
  toOrderBusinessStatusSummary,
} from "./utils"
import type { GetAdminOrderBusinessStatusesSchemaType } from "./validators"

export async function GET(
  req: MedusaRequest<unknown, GetAdminOrderBusinessStatusesSchemaType>,
  res: MedusaResponse
) {
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

  const orders = data as OrderBusinessStatusOrder[]

  res.json({
    orders: orders.map(toOrderBusinessStatusSummary),
    count: metadata?.count ?? orders.length,
    limit,
    offset,
  })
}
