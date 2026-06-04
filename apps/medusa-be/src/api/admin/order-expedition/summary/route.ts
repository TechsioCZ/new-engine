import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ICachingModuleService, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
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

const ORDER_EXPEDITION_SUMMARY_BATCH_SIZE = 500
const ORDER_EXPEDITION_SUMMARY_CACHE_KEY = "order-expedition:summary:v1"
const ORDER_EXPEDITION_SUMMARY_CACHE_TAG = "order-expedition:summary"
const ORDER_EXPEDITION_SUMMARY_CACHE_TTL_SECONDS = 120

type OrderExpeditionSummaryResponse = {
  action_required_count: number
  scanned_count: number
  status_counts: Record<OrderBusinessStatusId, number>
  total_count: number
  unhandled_count: number
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cacheService = resolveSummaryCacheService(req)
  const cachedSummary = await getCachedSummary(cacheService)

  if (cachedSummary) {
    res.json(cachedSummary)
    return
  }

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

  const summary: OrderExpeditionSummaryResponse = {
    action_required_count: getActionRequiredCount(statusCounts),
    scanned_count: scannedCount,
    status_counts: statusCounts,
    total_count: totalCount ?? scannedCount,
    unhandled_count: statusCounts.new,
  }

  await setCachedSummary(cacheService, summary)

  res.json(summary)
}

function resolveSummaryCacheService(req: MedusaRequest) {
  try {
    return req.scope.resolve<ICachingModuleService>(Modules.CACHING)
  } catch {
    return null
  }
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
    typeof summary.scanned_count === "number" &&
    typeof summary.total_count === "number" &&
    typeof summary.unhandled_count === "number" &&
    isOrderBusinessStatusCounts(summary.status_counts)
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

function createEmptyStatusCounts() {
  return ORDER_BUSINESS_STATUS_IDS.reduce(
    (counts, statusId) => ({
      ...counts,
      [statusId]: 0,
    }),
    {} as Record<OrderBusinessStatusId, number>
  )
}
