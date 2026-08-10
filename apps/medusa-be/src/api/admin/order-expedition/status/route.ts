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
  OrderExpeditionGraph,
  OrderExpeditionRawOrder,
  OrderExpeditionTargetStatus,
} from "../../../../utils/order-expedition"
import { clearOrderExpeditionSummaryCache } from "../../../../utils/order-expedition-summary-cache"
import { bulkCancelOrdersWorkflow } from "../../../../workflows/order-expedition/bulk-cancel-orders"
import type { OrderExpeditionDirectUpdateStatus } from "../../../../workflows/order-expedition/bulk-update-order-statuses"
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
interface OrderExpeditionStatusDependencies {
  archive: (orderIds: string[]) => Promise<void>
  cancel: (orderIds: string[]) => Promise<void>
  clearCache: () => Promise<void>
  complete: (orderIds: string[]) => Promise<void>
  query: OrderExpeditionGraph
  update: (
    orderIds: string[],
    targetStatus: OrderExpeditionDirectUpdateStatus,
  ) => Promise<void>
}
interface OrderExpeditionStatusResponse {
  json: (body: object) => unknown
  status: (statusCode: number) => OrderExpeditionStatusResponse
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
  dependencies: OrderExpeditionStatusDependencies,
  orderIds: string[],
  targetStatus: OrderExpeditionTargetStatus,
) => {
  if (targetStatus === "completed") {
    await dependencies.complete(orderIds)
    return
  }

  if (targetStatus === "archived") {
    await dependencies.archive(orderIds)
    return
  }

  if (isOrderExpeditionDirectUpdateStatus(targetStatus)) {
    await dependencies.update(orderIds, targetStatus)
    return
  }

  await dependencies.cancel(orderIds)
}

const toChangedOrder = (
  order: OrderExpeditionRawOrder,
): StatusChangedOrder => ({
  id: order.id,
  order_display_id: getOrderExpeditionDisplayId(order),
  status: order.status ?? null,
})

const uniqueOrderIds = (orderIds: string[]) => [...new Set(orderIds)]

export const postOrderExpeditionStatus = async (
  dependencies: OrderExpeditionStatusDependencies,
  validatedBody: PostAdminOrderExpeditionStatusSchemaType,
  res: OrderExpeditionStatusResponse,
): Promise<void> => {
  const { order_ids: requestedOrderIds, target_status: targetStatus } =
    validatedBody
  const orderIds = uniqueOrderIds(requestedOrderIds)

  const { missingOrderIds, orders } =
    await fetchOrderedOrderExpeditionOrdersByIds(dependencies.query, orderIds)
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

  await runStatusWorkflow(dependencies, orderIds, targetStatus)

  const { orders: changedOrders } =
    await fetchOrderedOrderExpeditionOrdersByIds(dependencies.query, orderIds)
  const changedExpeditionOrders = changedOrders.filter(
    isOrderExpeditionQueryOrder,
  )

  await dependencies.clearCache()

  res.json({
    count: changedExpeditionOrders.length,
    orders: changedExpeditionOrders.map(toChangedOrder),
    target_status: targetStatus,
  })
}

const post = async (
  req: MedusaRequest<PostAdminOrderExpeditionStatusSchemaType>,
  res: MedusaResponse,
): Promise<void> => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  await postOrderExpeditionStatus(
    {
      archive: async (orderIds) => {
        await archiveOrderWorkflow(req.scope).run({ input: { orderIds } })
      },
      cancel: async (orderIds) => {
        await bulkCancelOrdersWorkflow(req.scope).run({
          input: { order_ids: orderIds },
        })
      },
      clearCache: async () => {
        await clearOrderExpeditionSummaryCache(req.scope)
      },
      complete: async (orderIds) => {
        await completeOrderWorkflow(req.scope).run({ input: { orderIds } })
      },
      query: {
        graph: async (input) => await query.graph(input),
      },
      update: async (orderIds, targetStatus) => {
        await bulkUpdateOrderStatusesWorkflow(req.scope).run({
          input: {
            order_ids: orderIds,
            target_status: targetStatus,
          },
        })
      },
    },
    req.validatedBody,
    res,
  )
}

export { post as POST }
