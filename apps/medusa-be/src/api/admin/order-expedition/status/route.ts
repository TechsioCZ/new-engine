import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  archiveOrderWorkflow,
  completeOrderWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  findMissingOrderIds,
  getOrderExpeditionDisplayId,
  ORDER_EXPEDITION_ORDER_FIELDS,
  type OrderExpeditionBlockingOrder,
  type OrderExpeditionRawOrder,
  type OrderExpeditionTargetStatus,
  orderOrdersByRequestedIds,
  toOrderExpeditionBlockingOrder,
} from "../../../../utils/order-expedition"
import { bulkCancelOrdersWorkflow } from "../../../../workflows/order-expedition/bulk-cancel-orders"
import type { PostAdminOrderExpeditionStatusSchemaType } from "../validators"

type StatusChangedOrder = {
  id: string
  order_display_id: string
  status: string | null
}

export async function POST(
  req: MedusaRequest<PostAdminOrderExpeditionStatusSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const { order_ids: requestedOrderIds, target_status: targetStatus } =
    req.validatedBody
  const orderIds = uniqueOrderIds(requestedOrderIds)
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const orders = await fetchSelectedOrders(query, orderIds)
  const orderedOrders = orderOrdersByRequestedIds(orderIds, orders)
  const blockingOrders = collectBlockingOrders(
    orderIds,
    orderedOrders,
    targetStatus
  )

  if (blockingOrders.length) {
    res.status(400).json({
      code: "order_expedition_status_blocked",
      message: "One or more selected orders cannot transition to target status",
      target_status: targetStatus,
      blocked_orders: blockingOrders,
    })
    return
  }

  await runStatusWorkflow(
    req.scope,
    orderedOrders.map((order) => order.id),
    targetStatus
  )

  const changedOrders = orderOrdersByRequestedIds(
    orderIds,
    await fetchSelectedOrders(query, orderIds)
  )

  res.json({
    count: changedOrders.length,
    target_status: targetStatus,
    orders: changedOrders.map(toChangedOrder),
  })
}

async function fetchSelectedOrders(query: Query, orderIds: string[]) {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    filters: {
      id: orderIds,
    },
  })

  return data as OrderExpeditionRawOrder[]
}

function collectBlockingOrders(
  requestedOrderIds: string[],
  orders: OrderExpeditionRawOrder[],
  targetStatus: OrderExpeditionTargetStatus
) {
  const blockers: OrderExpeditionBlockingOrder[] = findMissingOrderIds(
    requestedOrderIds,
    orders
  ).map((orderId) => ({
    id: orderId,
    order_display_id: orderId,
    reason: "Order was not found",
  }))

  for (const order of orders) {
    const reason = getTransitionBlockReason(order, targetStatus)

    if (reason) {
      blockers.push(toOrderExpeditionBlockingOrder(order, reason))
    }
  }

  return blockers
}

function getTransitionBlockReason(
  order: OrderExpeditionRawOrder,
  targetStatus: OrderExpeditionTargetStatus
) {
  if (order.status === targetStatus) {
    return `Order is already ${targetStatus}`
  }

  if (order.status === "archived") {
    return "Archived orders cannot be changed"
  }

  if (order.status === "canceled") {
    return "Canceled orders cannot be changed"
  }

  if (targetStatus === "canceled" && order.status === "completed") {
    return "Completed orders cannot be canceled"
  }

  if (
    targetStatus === "canceled" &&
    order.fulfillments?.some((fulfillment) => !fulfillment.canceled_at)
  ) {
    return "Orders with active fulfillments cannot be canceled"
  }

  return
}

async function runStatusWorkflow(
  scope: MedusaRequest["scope"],
  orderIds: string[],
  targetStatus: OrderExpeditionTargetStatus
) {
  if (targetStatus === "completed") {
    await completeOrderWorkflow(scope).run({ input: { orderIds } })
    return
  }

  if (targetStatus === "archived") {
    await archiveOrderWorkflow(scope).run({ input: { orderIds } })
    return
  }

  await bulkCancelOrdersWorkflow(scope).run({
    input: {
      order_ids: orderIds,
    },
  })
}

function toChangedOrder(order: OrderExpeditionRawOrder): StatusChangedOrder {
  return {
    id: order.id,
    order_display_id: getOrderExpeditionDisplayId(order),
    status: order.status ?? null,
  }
}

function uniqueOrderIds(orderIds: string[]) {
  return [...new Set(orderIds)]
}
