import type { Query } from "@medusajs/framework/types"
import type OrderNoteModuleService from "../modules/order-note/service"
import {
  getOrderExpeditionNote,
  type OrderExpeditionRawOrder,
} from "./order-expedition"

export type OrderExpeditionCustomerSignals = {
  note: boolean
  returning_customer: boolean
  storn_orders: boolean
}

export type OrderExpeditionCustomerSignalCounts = {
  note: number
  returning_customer: number
  storn_orders: number
}

type OrderSignalSource = Pick<
  OrderExpeditionRawOrder,
  "customer_id" | "id" | "metadata" | "status"
>

type CustomerOrderCounters = {
  canceledCount: number
  totalCount: number
}

export async function resolveOrderExpeditionCustomerSignals(
  query: Query,
  orders: OrderSignalSource[],
  notesByOrderId?: Map<string, string>
): Promise<{
  counts: OrderExpeditionCustomerSignalCounts
  signalsByOrderId: Map<string, OrderExpeditionCustomerSignals>
}> {
  const customerIds = Array.from(
    new Set(orders.map((order) => order.customer_id).filter(isString))
  )

  const customerCounters = await fetchCustomerOrderCounters(query, customerIds)
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
      notesByOrderId
    )

    signalsByOrderId.set(order.id, signals)
    accumulateOrderExpeditionCustomerSignalCounts(counts, signals)
  }

  return {
    counts,
    signalsByOrderId,
  }
}

function buildOrderExpeditionCustomerSignals(
  order: OrderSignalSource,
  customerCounters: Map<string, CustomerOrderCounters>,
  notesByOrderId?: Map<string, string>
): OrderExpeditionCustomerSignals {
  const note = resolveOrderExpeditionCustomerNote(order, notesByOrderId)
  const customerCounter =
    order.customer_id && isString(order.customer_id)
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

function accumulateOrderExpeditionCustomerSignalCounts(
  counts: OrderExpeditionCustomerSignalCounts,
  signals: OrderExpeditionCustomerSignals
) {
  counts.note += signals.note ? 1 : 0
  counts.returning_customer += signals.returning_customer ? 1 : 0
  counts.storn_orders += signals.storn_orders ? 1 : 0
}

function resolveOrderExpeditionCustomerNote(
  order: OrderSignalSource,
  notesByOrderId?: Map<string, string>
) {
  const hasOrderNote = notesByOrderId?.has(order.id) ?? false

  return hasOrderNote
    ? Boolean(notesByOrderId?.get(order.id)?.trim())
    : Boolean(getOrderExpeditionNote(order.metadata))
}

async function fetchCustomerOrderCounters(
  query: Query,
  customerIds: string[]
): Promise<Map<string, CustomerOrderCounters>> {
  if (!customerIds.length) {
    return new Map()
  }

  const { data } = await query.graph({
    entity: "order",
    fields: ["customer_id", "status"],
    filters: { customer_id: customerIds },
    pagination: { skip: 0, take: 100_000 },
  })

  const counters = new Map<string, CustomerOrderCounters>()

  for (const order of Array.isArray(data) ? data : []) {
    const customerId =
      typeof order?.customer_id === "string" ? order.customer_id : undefined

    if (!customerId) {
      continue
    }

    const counter = counters.get(customerId) ?? {
      canceledCount: 0,
      totalCount: 0,
    }

    counter.totalCount += 1
    counter.canceledCount += order?.status === "canceled" ? 1 : 0
    counters.set(customerId, counter)
  }

  return counters
}

export async function fetchOrderExpeditionOrderNotesByOrderIds(
  orderNoteService: Pick<OrderNoteModuleService, "listOrderNotes">,
  orderIds: string[]
): Promise<Map<string, string>> {
  if (!orderIds.length) {
    return new Map()
  }

  const orderNotes = await orderNoteService.listOrderNotes(
    { order_id: orderIds },
    { take: orderIds.length }
  )
  const notesByOrderId = new Map<string, string>()

  for (const orderNote of orderNotes) {
    if (
      !orderNote ||
      typeof orderNote.order_id !== "string" ||
      typeof orderNote.note !== "string"
    ) {
      continue
    }

    const note = orderNote.note.trim()

    if (note) {
      notesByOrderId.set(orderNote.order_id, note)
    }
  }

  return notesByOrderId
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}
