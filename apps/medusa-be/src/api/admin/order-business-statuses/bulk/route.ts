import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IOrderModuleService, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getOrderBusinessManualStatusUpdateBlockReason } from "../../../../utils/order-business-status"
import {
  buildOrderBusinessStatusMetadata,
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  type OrderBusinessStatusOrder,
  parseOrderBusinessStatusOrders,
  toOrderBusinessStatusSummary,
} from "../utils"
import type { PostAdminOrderBusinessStatusesBulkSchemaType } from "../validators"

type SkippedOrder = {
  id: string
  order_display_id: string
  reason: string
}

export async function POST(
  req: MedusaRequest<PostAdminOrderBusinessStatusesBulkSchemaType>,
  res: MedusaResponse
) {
  const { order_ids: requestedOrderIds, status } = req.validatedBody
  const orderIds = [...new Set(requestedOrderIds)]
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderService = req.scope.resolve<IOrderModuleService>(Modules.ORDER)
  const orders = await fetchOrderBusinessStatusOrdersByIds(query, orderIds)
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const skipped: SkippedOrder[] = []
  const updatedOrderIds: string[] = []

  for (const orderId of orderIds) {
    const order = ordersById.get(orderId)

    if (!order) {
      skipped.push({
        id: orderId,
        order_display_id: orderId,
        reason: "Order was not found",
      })
      continue
    }

    const blockReason = getOrderBusinessManualStatusUpdateBlockReason(
      order,
      status
    )

    if (blockReason) {
      skipped.push({
        id: order.id,
        order_display_id: getOrderDisplayId(order),
        reason: blockReason,
      })
      continue
    }

    await orderService.updateOrders(order.id, {
      metadata: buildOrderBusinessStatusMetadata(order.metadata, status),
    })
    updatedOrderIds.push(order.id)
  }

  const updatedOrders = updatedOrderIds.length
    ? await fetchOrderBusinessStatusOrdersByIds(query, updatedOrderIds)
    : []

  res.json({
    count: updatedOrders.length,
    skipped_count: skipped.length,
    status,
    orders: updatedOrders.map(toOrderBusinessStatusSummary),
    skipped,
  })
}

async function fetchOrderBusinessStatusOrdersByIds(
  query: Query,
  ids: string[]
) {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    filters: {
      id: ids,
    },
  })

  return parseOrderBusinessStatusOrders(data)
}

function getOrderDisplayId(order: OrderBusinessStatusOrder) {
  return order.custom_display_id || `#${order.display_id ?? order.id}`
}
