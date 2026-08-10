import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ICachingModuleService, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_NOTE_MODULE } from "../../../../modules/order-note"
import type OrderNoteModuleService from "../../../../modules/order-note/service"
import {
  ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS,
  isPendingUnpaidOrder,
  ORDER_BUSINESS_STATUS_IDS,
  resolveOrderBusinessStatus,
} from "../../../../utils/order-business-status"
import type { OrderBusinessStatusId } from "../../../../utils/order-business-status"
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

interface OrderExpeditionSummaryResponse {
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

interface OrderCustomerCounters {
  canceledCount: number
  totalCount: number
}

interface OrderBusinessStatusTotals {
  pendingUnpaidCount: number
  scannedCount: number
  totalCount: number | null
}

type OrderCustomerSignalCounts = OrderExpeditionSummaryResponse["signal_counts"]

const isOrderBusinessStatusCounts = (
  value: unknown,
): value is Record<OrderBusinessStatusId, number> => {
  if (!(typeof value === "object" && value !== null)) {
    return false
  }

  const counts = value as Partial<Record<OrderBusinessStatusId, unknown>>

  return ORDER_BUSINESS_STATUS_IDS.every(
    (statusId) => typeof counts[statusId] === "number",
  )
}

const isOrderExpeditionSignalCounts = (
  value: unknown,
): value is OrderExpeditionSummaryResponse["signal_counts"] => {
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

const isOrderExpeditionSummaryResponse = (
  value: unknown,
): value is OrderExpeditionSummaryResponse => {
  if (!(typeof value === "object" && value !== null)) {
    return false
  }

  const summary = value as Partial<OrderExpeditionSummaryResponse>

  if (typeof summary.action_required_count !== "number") {
    return false
  }
  if (typeof summary.pending_unpaid_count !== "number") {
    return false
  }
  if (typeof summary.scanned_count !== "number") {
    return false
  }
  if (typeof summary.total_count !== "number") {
    return false
  }
  if (typeof summary.unhandled_count !== "number") {
    return false
  }

  return (
    isOrderBusinessStatusCounts(summary.status_counts) &&
    isOrderExpeditionSignalCounts(summary.signal_counts)
  )
}

const getCachedSummary = async (
  cacheService: ICachingModuleService | null,
): Promise<OrderExpeditionSummaryResponse | null> => {
  if (!cacheService) {
    return null
  }

  try {
    const cached: unknown = await cacheService.get({
      key: ORDER_EXPEDITION_SUMMARY_CACHE_KEY,
    })

    return isOrderExpeditionSummaryResponse(cached) ? cached : null
  } catch {
    return null
  }
}

const setCachedSummary = async (
  cacheService: ICachingModuleService | null,
  summary: OrderExpeditionSummaryResponse,
) => {
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

const createEmptyStatusCounts = (): Record<OrderBusinessStatusId, number> => ({
  awaiting_payment: 0,
  canceled: 0,
  delivered: 0,
  new: 0,
  paid: 0,
  processing: 0,
  shipped: 0,
  waiting_for_supplier: 0,
})

const createEmptySignalCounts = (): OrderCustomerSignalCounts => ({
  note: 0,
  returning_customer: 0,
  storn_orders: 0,
})

const accumulateStatusAndCustomerCounters = (
  statusCounts: Record<OrderBusinessStatusId, number>,
  customerCounters: Map<string, OrderCustomerCounters>,
  orders: ReturnType<typeof parseOrderBusinessStatusOrders>,
) => {
  for (const order of orders) {
    const statusId = resolveOrderBusinessStatus(order).id
    statusCounts[statusId] += 1

    const customerId =
      typeof order.customer_id === "string" ? order.customer_id : undefined

    if (customerId === undefined || customerId === "") {
      continue
    }

    const counter = customerCounters.get(customerId) ?? {
      canceledCount: 0,
      totalCount: 0,
    }

    counter.totalCount += 1
    counter.canceledCount += order.status === "canceled" ? 1 : 0
    customerCounters.set(customerId, counter)
  }
}

const accumulatePendingUnpaidCount = (
  orders: ReturnType<typeof parseOrderBusinessStatusOrders>,
) => {
  let count = 0

  for (const order of orders) {
    count += isPendingUnpaidOrder(order) ? 1 : 0
  }

  return count
}

const accumulateSignalCounts = (
  target: OrderCustomerSignalCounts,
  source: OrderCustomerSignalCounts,
) => {
  target.note += source.note
  target.returning_customer += source.returning_customer
  target.storn_orders += source.storn_orders
}

const getActionRequiredCount = (
  statusCounts: Record<OrderBusinessStatusId, number>,
) =>
  ACTION_REQUIRED_ORDER_BUSINESS_STATUS_IDS.reduce(
    (count, statusId) => count + statusCounts[statusId],
    0,
  )

const collectOrderBusinessStatusTotals = async (
  query: Query,
  statusCounts: Record<OrderBusinessStatusId, number>,
  customerCounters: Map<string, OrderCustomerCounters>,
  offset = 0,
  totalCount: number | null = null,
  scannedCount = 0,
  pendingUnpaidCount = 0,
): Promise<OrderBusinessStatusTotals> => {
  const { data, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: ORDER_EXPEDITION_SUMMARY_BATCH_SIZE,
    },
  })
  const orders = parseOrderBusinessStatusOrders(data)
  const nextTotalCount = totalCount ?? metadata?.count ?? null

  accumulateStatusAndCustomerCounters(statusCounts, customerCounters, orders)

  const nextScannedCount = scannedCount + orders.length
  const nextPendingUnpaidCount =
    pendingUnpaidCount + accumulatePendingUnpaidCount(orders)
  const nextOffset = offset + orders.length

  if (
    !orders.length ||
    (nextTotalCount !== null && nextOffset >= nextTotalCount)
  ) {
    return {
      pendingUnpaidCount: nextPendingUnpaidCount,
      scannedCount: nextScannedCount,
      totalCount: nextTotalCount,
    }
  }

  return await collectOrderBusinessStatusTotals(
    query,
    statusCounts,
    customerCounters,
    nextOffset,
    nextTotalCount,
    nextScannedCount,
    nextPendingUnpaidCount,
  )
}

const collectOrderExpeditionSignalCounts = async (
  query: Query,
  orderNoteService: OrderNoteModuleService,
  customerCounters: Map<string, OrderCustomerCounters>,
  signalCounts: OrderCustomerSignalCounts,
  totalCount: number | null,
  offset = 0,
): Promise<void> => {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: ORDER_EXPEDITION_SUMMARY_BATCH_SIZE,
    },
  })
  const orders = parseOrderBusinessStatusOrders(data)

  if (!orders.length) {
    return
  }

  const notesByOrderId = await fetchOrderExpeditionOrderNotesByOrderIds(
    orderNoteService,
    orders.map((order) => order.id),
  )
  const { counts: pageSignalCounts } =
    await resolveOrderExpeditionCustomerSignals(
      query,
      orders,
      notesByOrderId,
      customerCounters,
    )

  accumulateSignalCounts(signalCounts, pageSignalCounts)

  const nextOffset = offset + orders.length

  if (totalCount !== null && nextOffset >= totalCount) {
    return
  }

  await collectOrderExpeditionSignalCounts(
    query,
    orderNoteService,
    customerCounters,
    signalCounts,
    totalCount,
    nextOffset,
  )
}

const getOrderExpeditionSummary = async (
  req: MedusaRequest,
  res: MedusaResponse,
) => {
  const cacheService = resolveOrderExpeditionSummaryCacheService(req.scope)
  const cachedSummary = await getCachedSummary(cacheService)

  if (cachedSummary) {
    res.json(cachedSummary)
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderNoteService =
    req.scope.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
  const statusCounts = createEmptyStatusCounts()
  const customerCounters = new Map<string, OrderCustomerCounters>()

  const { pendingUnpaidCount, scannedCount, totalCount } =
    await collectOrderBusinessStatusTotals(
      query,
      statusCounts,
      customerCounters,
    )

  const signalCounts = createEmptySignalCounts()

  await collectOrderExpeditionSignalCounts(
    query,
    orderNoteService,
    customerCounters,
    signalCounts,
    totalCount,
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

export { getOrderExpeditionSummary as GET }
