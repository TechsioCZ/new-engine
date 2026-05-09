import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  archiveOrderWorkflow,
  completeOrderWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  fetchOrderExpeditionOrdersByIds,
  findMissingOrderIds,
  getOrderExpeditionDisplayId,
  getOrderExpeditionTransitionBlockReason,
  type OrderExpeditionBlockingOrder,
  type OrderExpeditionRawOrder,
  type OrderExpeditionTargetStatus,
  orderOrdersByRequestedIds,
  toOrderExpeditionBlockingOrder,
} from "../../../../utils/order-expedition"
import { bulkCancelOrdersWorkflow } from "../../../../workflows/order-expedition/bulk-cancel-orders"
import {
  bulkUpdateOrderStatusesWorkflow,
  isOrderExpeditionDirectUpdateStatus,
} from "../../../../workflows/order-expedition/bulk-update-order-statuses"
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

  const orders = await fetchOrderExpeditionOrdersByIds(query, orderIds)
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

  await runStatusWorkflow(req.scope, orderIds, targetStatus)

  const changedOrders = orderOrdersByRequestedIds(
    orderIds,
    await fetchOrderExpeditionOrdersByIds(query, orderIds)
  )

  res.json({
    count: changedOrders.length,
    target_status: targetStatus,
    orders: changedOrders.map(toChangedOrder),
  })
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
    const reason = getOrderExpeditionTransitionBlockReason(order, targetStatus)

    if (reason) {
      blockers.push(toOrderExpeditionBlockingOrder(order, reason))
    }
  }

  return blockers
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

  if (isOrderExpeditionDirectUpdateStatus(targetStatus)) {
    await bulkUpdateOrderStatusesWorkflow(scope).run({
      input: {
        order_ids: orderIds,
        target_status: targetStatus,
      },
    })
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
