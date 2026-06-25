import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ICachingModuleService, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_NOTE_MODULE } from "../../../../modules/order-note"
import type OrderNoteModuleService from "../../../../modules/order-note/service"
import {
  ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS,
  isPendingUnpaidOrder,
  ORDER_BUSINESS_STATUS_IDS,
  type OrderBusinessStatusId,
  resolveOrderBusinessStatus,
} from "../../../../utils/order-business-status"
import {
  fetchOrderExpeditionOrderNotesByOrderIds,
  resolveOrderExpeditionCustomerSignals,
} from "../../../../utils/order-expedition-customer-signals"
import {
  ORDER_EXPEDITION_SUMMARY_CACHE_KEY,
  ORDER_EXPEDITION_SUMMARY_CACHE_TAG,
  ORDER_EXPEDITION_SUMMARY_CACHE_TTL_SECONDS,
  resolveOrderExpeditionSummaryCacheService,
} from "../../../../utils/order-expedition-summary-cache"
import {
  ORDER_BUSINESS_STATUS_ORDER_FIELDS,
  parseOrderBusinessStatusOrders,
} from "../../order-business-statuses/utils"

const ORDER_EXPEDITION_SUMMARY_BATCH_SIZE = 500

type OrderExpeditionSummaryResponse = {
  action_required_count: number
  pending_unpaid_count: number
  scanned_count: number
  signal_counts: {
    note: number
    returning_customer: number
    storn_orders: number
  }
  status_counts: Record<OrderBusinessStatusId, number>
  total_count: number
  unhandled_count: number
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cacheService = resolveOrderExpeditionSummaryCacheService(req.scope)
  const cachedSummary = await getCachedSummary(cacheService)

  if (cachedSummary) {
    res.json(cachedSummary)
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderNoteService =
    req.scope.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
  let offset = 0
  let totalCount: number | null = null
  let pendingUnpaidCount = 0
  let scannedCount = 0
  const statusCounts = createEmptyStatusCounts()
  const scannedOrders = [] as Array<{
    customer_id?: string | null
    id: string
    metadata?: Record<string, unknown> | null
    status?: string | null
  }>

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
    scannedOrders.push(...orders)
    for (const order of orders) {
      const statusId = resolveOrderBusinessStatus(order).id
      statusCounts[statusId] += 1
      pendingUnpaidCount += isPendingUnpaidOrder(order) ? 1 : 0
    }

    offset += orders.length

    if (!orders.length || (totalCount !== null && offset >= totalCount)) {
      break
    }
  }

  const notesByOrderId = await fetchOrderExpeditionOrderNotesByOrderIds(
    orderNoteService,
    scannedOrders.map((order) => order.id)
  )
  const { counts: signalCounts } = await resolveOrderExpeditionCustomerSignals(
    query,
    scannedOrders,
    notesByOrderId
  )

  const summary: OrderExpeditionSummaryResponse = {
    action_required_count: getActionRequiredCount(statusCounts),
    pending_unpaid_count: pendingUnpaidCount,
    scanned_count: scannedCount,
    signal_counts: signalCounts,
    status_counts: statusCounts,
    total_count: totalCount ?? scannedCount,
    unhandled_count: statusCounts.new,
  }

  await setCachedSummary(cacheService, summary)

  res.json(summary)
}

async function getCachedSummary(
  cacheService: ICachingModuleService | null
): Promise<OrderExpeditionSummaryResponse | null> {
  if (!cacheService) {
    return null
  }

  try {
    const cached = await cacheService.get({
      key: ORDER_EXPEDITION_SUMMARY_CACHE_KEY,
    })

    return isOrderExpeditionSummaryResponse(cached) ? cached : null
  } catch {
    return null
  }
}

async function setCachedSummary(
  cacheService: ICachingModuleService | null,
  summary: OrderExpeditionSummaryResponse
) {
  if (!cacheService) {
    return
  }

  try {
    await cacheService.set({
      data: summary,
      key: ORDER_EXPEDITION_SUMMARY_CACHE_KEY,
      tags: [ORDER_EXPEDITION_SUMMARY_CACHE_TAG],
      ttl: ORDER_EXPEDITION_SUMMARY_CACHE_TTL_SECONDS,
    })
  } catch {
    // Summary remains usable even without a cache write.
  }
}

function isOrderExpeditionSummaryResponse(
  value: unknown
): value is OrderExpeditionSummaryResponse {
  if (!(typeof value === "object" && value !== null)) {
    return false
  }

  const summary = value as Partial<OrderExpeditionSummaryResponse>

  return (
    typeof summary.action_required_count === "number" &&
    typeof summary.pending_unpaid_count === "number" &&
    typeof summary.scanned_count === "number" &&
    typeof summary.total_count === "number" &&
    typeof summary.unhandled_count === "number" &&
    isOrderBusinessStatusCounts(summary.status_counts) &&
    isOrderExpeditionSignalCounts(summary.signal_counts)
  )
}

function isOrderBusinessStatusCounts(
  value: unknown
): value is Record<OrderBusinessStatusId, number> {
  if (!(typeof value === "object" && value !== null)) {
    return false
  }

  const counts = value as Partial<Record<OrderBusinessStatusId, unknown>>

  return ORDER_BUSINESS_STATUS_IDS.every(
    (statusId) => typeof counts[statusId] === "number"
  )
}

function getActionRequiredCount(
  statusCounts: Record<OrderBusinessStatusId, number>
) {
  return ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS.reduce(
    (count, statusId) => count + statusCounts[statusId],
    0
  )
}

function isOrderExpeditionSignalCounts(
  value: unknown
): value is OrderExpeditionSummaryResponse["signal_counts"] {
  if (!(typeof value === "object" && value !== null)) {
    return false
  }

  const counts = value as Partial<
    OrderExpeditionSummaryResponse["signal_counts"]
  >

  return (
    typeof counts.note === "number" &&
    typeof counts.returning_customer === "number" &&
    typeof counts.storn_orders === "number"
  )
}

function createEmptyStatusCounts() {
  const counts = {} as Record<OrderBusinessStatusId, number>

  for (const statusId of ORDER_BUSINESS_STATUS_IDS) {
    counts[statusId] = 0
  }

  return counts
}
