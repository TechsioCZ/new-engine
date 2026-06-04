import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  parseOrderBusinessStatusOrders,
} from "../../order-business-statuses/utils"
import {
  ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS,
  ORDER_BUSINESS_STATUS_IDS,
  type OrderBusinessStatusId,
  resolveOrderBusinessStatus,
} from "../../../../utils/order-business-status"

const ORDER_EXPEDITION_SUMMARY_BATCH_SIZE = 100

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  let offset = 0
  let totalCount: number | null = null
  let scannedCount = 0
  const statusCounts = createEmptyStatusCounts()

  while (true) {
    const { data, metadata } = await query.graph({
      entity: "order",
      fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
      pagination: {
        skip: offset,
        take: ORDER_EXPEDITION_SUMMARY_BATCH_SIZE,
      },
    })
    const orders = parseOrderBusinessStatusOrders(data)

    totalCount = totalCount ?? metadata?.count ?? null
    scannedCount += orders.length
    for (const order of orders) {
      const statusId = resolveOrderBusinessStatus(order).id
      statusCounts[statusId] += 1
    }

    offset += orders.length

    if (!orders.length || (totalCount !== null && offset >= totalCount)) {
      break
    }
  }

  res.json({
    action_required_count: getActionRequiredCount(statusCounts),
    scanned_count: scannedCount,
    status_counts: statusCounts,
    total_count: totalCount ?? scannedCount,
    unhandled_count: statusCounts.new,
  })
}

function getActionRequiredCount(
  statusCounts: Record<OrderBusinessStatusId, number>
) {
  return ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS.reduce(
    (count, statusId) => count + statusCounts[statusId],
    0
  )
}

function createEmptyStatusCounts() {
  return ORDER_BUSINESS_STATUS_IDS.reduce(
    (counts, statusId) => ({
      ...counts,
      [statusId]: 0,
    }),
    {} as Record<OrderBusinessStatusId, number>
  )
}
