import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import type OrderNoteModuleService from "../modules/order-note/service"
import { getOrderExpeditionNote } from "./order-expedition"
import type {
  OrderExpeditionCustomerSignals,
  OrderExpeditionRawOrder,
} from "./order-expedition"

export interface OrderExpeditionCustomerSignalCounts {
  note: number
  returning_customer: number
  storn_orders: number
}

type OrderSignalSource = Pick<
  OrderExpeditionRawOrder,
  "customer_id" | "id" | "metadata" | "status"
>

interface CustomerOrderCounters {
  canceledCount: number
  totalCount: number
}

const CUSTOMER_ORDER_COUNTER_LOOKUP_CHUNK_SIZE = 1000
const MAX_CUSTOMER_ORDER_COUNTER_LOOKUP = 100_000

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0

const resolveOrderExpeditionCustomerNote = (
  order: OrderSignalSource,
  notesByOrderId?: Map<string, string>,
) => {
  const hasOrderNote = notesByOrderId?.has(order.id) ?? false

  if (hasOrderNote) {
    return (notesByOrderId?.get(order.id)?.trim().length ?? 0) > 0
  }

  const metadataNote = getOrderExpeditionNote(order.metadata)
  return metadataNote !== null && metadataNote.length > 0
}

const buildOrderExpeditionCustomerSignals = (
  order: OrderSignalSource,
  customerCounters: Map<string, CustomerOrderCounters>,
  notesByOrderId?: Map<string, string>,
): OrderExpeditionCustomerSignals => {
  const note = resolveOrderExpeditionCustomerNote(order, notesByOrderId)
  const customerCounter = isNonEmptyString(order.customer_id)
    ? customerCounters.get(order.customer_id)
    : undefined
  const returningCustomer = (customerCounter?.totalCount ?? 0) >= 2
  const stornOrders =
    order.status === "canceled" && (customerCounter?.canceledCount ?? 0) >= 2

  return {
    note,
    returning_customer: returningCustomer,
    storn_orders: stornOrders,
  }
}

const accumulateOrderExpeditionCustomerSignalCounts = (
  counts: OrderExpeditionCustomerSignalCounts,
  signals: OrderExpeditionCustomerSignals,
) => {
  counts.note += signals.note ? 1 : 0
  counts.returning_customer += signals.returning_customer ? 1 : 0
  counts.storn_orders += signals.storn_orders ? 1 : 0
}

const fetchCustomerOrderCountersPage = async (
  query: Query,
  customerIds: string[],
  counters: Map<string, CustomerOrderCounters>,
  skip: number,
): Promise<Map<string, CustomerOrderCounters>> => {
  if (skip >= MAX_CUSTOMER_ORDER_COUNTER_LOOKUP) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Customer order counter lookup exceeded ${MAX_CUSTOMER_ORDER_COUNTER_LOOKUP} records`,
    )
  }

  const graphResult: unknown = await query.graph({
    entity: "order",
    fields: ["customer_id", "status"],
    filters: { customer_id: customerIds },
    pagination: {
      skip,
      take: CUSTOMER_ORDER_COUNTER_LOOKUP_CHUNK_SIZE,
    },
  })
  const orders =
    isRecord(graphResult) && Array.isArray(graphResult["data"])
      ? graphResult["data"]
      : []

  for (const order of orders) {
    if (!isRecord(order) || !isNonEmptyString(order["customer_id"])) {
      continue
    }

    const customerId = order["customer_id"]
    const counter = counters.get(customerId) ?? {
      canceledCount: 0,
      totalCount: 0,
    }

    counter.totalCount += 1
    counter.canceledCount += order["status"] === "canceled" ? 1 : 0
    counters.set(customerId, counter)
  }

  if (orders.length < CUSTOMER_ORDER_COUNTER_LOOKUP_CHUNK_SIZE) {
    return counters
  }

  return await fetchCustomerOrderCountersPage(
    query,
    customerIds,
    counters,
    skip + CUSTOMER_ORDER_COUNTER_LOOKUP_CHUNK_SIZE,
  )
}

const fetchCustomerOrderCounters = async (
  query: Query,
  customerIds: string[],
): Promise<Map<string, CustomerOrderCounters>> => {
  if (customerIds.length === 0) {
    return new Map()
  }

  return await fetchCustomerOrderCountersPage(query, customerIds, new Map(), 0)
}

export const resolveOrderExpeditionCustomerSignals = async (
  query: Query,
  orders: OrderSignalSource[],
  notesByOrderId?: Map<string, string>,
  customerCountersOverride?: Map<string, CustomerOrderCounters>,
): Promise<{
  counts: OrderExpeditionCustomerSignalCounts
  signalsByOrderId: Map<string, OrderExpeditionCustomerSignals>
}> => {
  const uniqueCustomerIds = new Set<string>()
  for (const order of orders) {
    if (isNonEmptyString(order.customer_id)) {
      uniqueCustomerIds.add(order.customer_id)
    }
  }
  const customerIds = [...uniqueCustomerIds]
  const customerCounters =
    customerCountersOverride ??
    (await fetchCustomerOrderCounters(query, customerIds))
  const counts: OrderExpeditionCustomerSignalCounts = {
    note: 0,
    returning_customer: 0,
    storn_orders: 0,
  }
  const signalsByOrderId = new Map<string, OrderExpeditionCustomerSignals>()

  for (const order of orders) {
    const signals = buildOrderExpeditionCustomerSignals(
      order,
      customerCounters,
      notesByOrderId,
    )

    signalsByOrderId.set(order.id, signals)
    accumulateOrderExpeditionCustomerSignalCounts(counts, signals)
  }

  return {
    counts,
    signalsByOrderId,
  }
}

export const fetchOrderExpeditionOrderNotesByOrderIds = async (
  orderNoteService: Pick<OrderNoteModuleService, "listOrderNotes">,
  orderIds: string[],
): Promise<Map<string, string>> => {
  if (orderIds.length === 0) {
    return new Map()
  }

  const orderNotes = await orderNoteService.listOrderNotes(
    { order_id: orderIds },
    { take: orderIds.length },
  )
  const notesByOrderId = new Map<string, string>()

  for (const orderNote of orderNotes) {
    if (
      typeof orderNote.order_id !== "string" ||
      typeof orderNote.note !== "string"
    ) {
      continue
    }

    const note = orderNote.note.trim()
    if (note !== "") {
      notesByOrderId.set(orderNote.order_id, note)
    }
  }

  return notesByOrderId
}
