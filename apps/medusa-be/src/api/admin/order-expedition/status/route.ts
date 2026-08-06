import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  archiveOrderWorkflow,
  completeOrderWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  fetchOrderedOrderExpeditionOrdersByIds,
  getOrderExpeditionDisplayId,
  getOrderExpeditionTransitionBlockReason,
  isOrderExpeditionRawOrder,
  toOrderExpeditionBlockingOrder,
} from "../../../../utils/order-expedition"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionRawOrder,
  OrderExpeditionTargetStatus,
} from "../../../../utils/order-expedition"
import { clearOrderExpeditionSummaryCache } from "../../../../utils/order-expedition-summary-cache"
import { bulkCancelOrdersWorkflow } from "../../../../workflows/order-expedition/bulk-cancel-orders"
import {
  bulkUpdateOrderStatusesWorkflow,
  isOrderExpeditionDirectUpdateStatus,
} from "../../../../workflows/order-expedition/bulk-update-order-statuses"
import type { PostAdminOrderExpeditionStatusSchemaType } from "../validators"

interface StatusChangedOrder {
  id: string
  order_display_id: string
  status: string | null
}

const isOrderExpeditionQueryOrder = <T>(
  order: T,
): order is T & OrderExpeditionRawOrder => isOrderExpeditionRawOrder(order)

const collectBlockingOrders = (
  missingOrderIds: string[],
  orders: OrderExpeditionRawOrder[],
  targetStatus: OrderExpeditionTargetStatus,
) => {
  const blockers: OrderExpeditionBlockingOrder[] = missingOrderIds.map(
    (orderId) => ({
      id: orderId,
      order_display_id: orderId,
      reason: "Order was not found",
    }),
  )

  for (const order of orders) {
    const reason = getOrderExpeditionTransitionBlockReason(order, targetStatus)

    if (reason !== undefined && reason !== null && reason !== "") {
      blockers.push(toOrderExpeditionBlockingOrder(order, reason))
    }
  }

  return blockers
}

const runStatusWorkflow = async (
  scope: MedusaRequest["scope"],
  orderIds: string[],
  targetStatus: OrderExpeditionTargetStatus,
) => {
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

const toChangedOrder = (
  order: OrderExpeditionRawOrder,
): StatusChangedOrder => ({
  id: order.id,
  order_display_id: getOrderExpeditionDisplayId(order),
  status: order.status ?? null,
})

const uniqueOrderIds = (orderIds: string[]) => [...new Set(orderIds)]

const post = async (
  req: MedusaRequest<PostAdminOrderExpeditionStatusSchemaType>,
  res: MedusaResponse,
): Promise<void> => {
  const { order_ids: requestedOrderIds, target_status: targetStatus } =
    req.validatedBody
  const orderIds = uniqueOrderIds(requestedOrderIds)
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { missingOrderIds, orders } =
    await fetchOrderedOrderExpeditionOrdersByIds(query, orderIds)
  const expeditionOrders = orders.filter(isOrderExpeditionQueryOrder)
  const blockingOrders = collectBlockingOrders(
    missingOrderIds,
    expeditionOrders,
    targetStatus,
  )

  if (blockingOrders.length) {
    res.status(400).json({
      blocked_orders: blockingOrders,
      code: "order_expedition_status_blocked",
      message: "One or more selected orders cannot transition to target status",
      target_status: targetStatus,
    })
    return
  }

  await runStatusWorkflow(req.scope, orderIds, targetStatus)

  const { orders: changedOrders } =
    await fetchOrderedOrderExpeditionOrdersByIds(query, orderIds)
  const changedExpeditionOrders = changedOrders.filter(
    isOrderExpeditionQueryOrder,
  )

  await clearOrderExpeditionSummaryCache(req.scope)

  res.json({
    count: changedExpeditionOrders.length,
    orders: changedExpeditionOrders.map(toChangedOrder),
    target_status: targetStatus,
  })
}

export { post as POST }
