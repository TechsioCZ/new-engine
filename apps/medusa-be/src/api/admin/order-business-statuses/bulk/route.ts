import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IOrderModuleService, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { getOrderBusinessManualStatusUpdateBlockReason } from "../../../../utils/order-business-status"
import { clearOrderExpeditionSummaryCache } from "../../../../utils/order-expedition-summary-cache"
import {
  buildOrderBusinessStatusMetadata,
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  parseOrderBusinessStatusOrders,
  toOrderBusinessStatusSummary,
} from "../utils"
import type { OrderBusinessStatusOrder } from "../utils"
import type { PostAdminOrderBusinessStatusesBulkSchemaType } from "../validators"

interface SkippedOrder {
  id: string
  order_display_id: string
  reason: string
}

interface UpdateCandidate {
  id: string
  order_display_id: string
  metadata: Record<string, unknown>
}

const UPDATE_CHUNK_SIZE = 25

const getOrderDisplayId = (order: OrderBusinessStatusOrder) => {
  const customDisplayId = order.custom_display_id
  if (
    customDisplayId !== null &&
    customDisplayId !== undefined &&
    customDisplayId !== ""
  ) {
    return customDisplayId
  }

  return `#${order.display_id ?? order.id}`
}

const getUpdateFailureReason = (reason: unknown) =>
  reason instanceof Error ? `Update failed: ${reason.message}` : "Update failed"

const fetchOrderBusinessStatusOrdersByIds = async (
  query: Query,
  ids: string[],
) => {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    filters: {
      id: ids,
    },
  })

  return parseOrderBusinessStatusOrders(data)
}

const updateOrdersInChunks = async (
  orderService: IOrderModuleService,
  candidates: UpdateCandidate[],
  skipped: SkippedOrder[],
) => {
  const updatedOrderIds: string[] = []

  const updateChunk = async (index: number): Promise<void> => {
    if (index >= candidates.length) {
      return
    }

    const chunk = candidates.slice(index, index + UPDATE_CHUNK_SIZE)
    const results = await Promise.allSettled(
      chunk.map(
        async (order) =>
          await orderService.updateOrders(order.id, {
            metadata: order.metadata,
          }),
      ),
    )

    for (const [resultIndex, result] of results.entries()) {
      const order = chunk[resultIndex]

      if (order !== undefined) {
        if (result.status === "fulfilled") {
          updatedOrderIds.push(order.id)
        } else {
          skipped.push({
            id: order.id,
            order_display_id: order.order_display_id,
            reason: getUpdateFailureReason(result.reason),
          })
        }
      }
    }

    await updateChunk(index + UPDATE_CHUNK_SIZE)
  }

  await updateChunk(0)
  return updatedOrderIds
}

const post = async (
  req: MedusaRequest<PostAdminOrderBusinessStatusesBulkSchemaType>,
  res: MedusaResponse,
) => {
  const { order_ids: requestedOrderIds, status } = req.validatedBody
  const orderIds = [...new Set(requestedOrderIds)]
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderService = req.scope.resolve<IOrderModuleService>(Modules.ORDER)
  const orders = await fetchOrderBusinessStatusOrdersByIds(query, orderIds)
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const skipped: SkippedOrder[] = []
  const updateCandidates: UpdateCandidate[] = []

  for (const orderId of orderIds) {
    const order = ordersById.get(orderId)

    if (order === undefined) {
      skipped.push({
        id: orderId,
        order_display_id: orderId,
        reason: "Order was not found",
      })
    } else {
      const blockReason = getOrderBusinessManualStatusUpdateBlockReason(
        order,
        status,
      )

      if (
        blockReason !== null &&
        blockReason !== undefined &&
        blockReason !== ""
      ) {
        skipped.push({
          id: order.id,
          order_display_id: getOrderDisplayId(order),
          reason: blockReason,
        })
      } else {
        updateCandidates.push({
          id: order.id,
          metadata: buildOrderBusinessStatusMetadata(order.metadata, status),
          order_display_id: getOrderDisplayId(order),
        })
      }
    }
  }

  const updatedOrderIds = await updateOrdersInChunks(
    orderService,
    updateCandidates,
    skipped,
  )

  const updatedOrders =
    updatedOrderIds.length > 0
      ? await fetchOrderBusinessStatusOrdersByIds(query, updatedOrderIds)
      : []

  if (updatedOrderIds.length > 0) {
    await clearOrderExpeditionSummaryCache(req.scope)
  }

  res.json({
    count: updatedOrders.length,
    orders: updatedOrders.map(toOrderBusinessStatusSummary),
    skipped,
    skipped_count: skipped.length,
    status,
  })
}

export { post as POST }
