import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  isOrderExpeditionRawOrder,
  ORDER_EXPEDITION_DEFAULT_LIMIT,
  ORDER_EXPEDITION_ORDER_FIELDS,
  type OrderExpeditionCarrierKey,
  type OrderExpeditionRawOrder,
  orderMatchesExpeditionCarrier,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import type { GetAdminOrderExpeditionOrdersSchemaType } from "../validators"

type OrderExpeditionOrdersPage = {
  carrierFilterLimitReached: boolean
  count: number
  countExact: boolean
  hasNext: boolean
  orders: OrderExpeditionRawOrder[]
  scannedCount: number | null
}
type CarrierFilterAccumulator = {
  matchingCount: number
  matchingOrders: OrderExpeditionRawOrder[]
}
type CollectMatchingCarrierOrdersInput = {
  accumulator: CarrierFilterAccumulator
  carrier: OrderExpeditionCarrierKey
  limit: number
  offset: number
  orders: OrderExpeditionRawOrder[]
}

const ORDER_EXPEDITION_SCAN_BATCH_SIZE = 100
const ORDER_EXPEDITION_CARRIER_SCAN_MAX_ROWS = 1000

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { carrier, limit, offset } =
    req.validatedQuery as GetAdminOrderExpeditionOrdersSchemaType
  const normalizedLimit = limit ?? ORDER_EXPEDITION_DEFAULT_LIMIT
  const normalizedOffset = offset ?? 0

  const result = carrier
    ? await fetchCarrierFilteredOrders(
        query,
        carrier,
        normalizedLimit,
        normalizedOffset
      )
    : await fetchOrders(query, normalizedLimit, normalizedOffset)

  res.json({
    orders: result.orders.map(toOrderExpeditionDto),
    count: result.count,
    has_next: result.hasNext,
    count_exact: result.countExact,
    carrier_filter_limit_reached: result.carrierFilterLimitReached,
    scanned_count: result.scannedCount,
    offset: normalizedOffset,
    limit: normalizedLimit,
    carrier: carrier ?? null,
  })
}

async function fetchOrders(
  query: Query,
  limit: number,
  offset: number
): Promise<OrderExpeditionOrdersPage> {
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: limit,
    },
  })
  const validOrders = Array.isArray(orders)
    ? orders.filter(isOrderExpeditionRawOrder)
    : []
  const count = metadata?.count ?? validOrders.length

  return {
    orders: validOrders,
    count,
    hasNext: offset + limit < count,
    countExact: true,
    carrierFilterLimitReached: false,
    scannedCount: null,
  }
}

async function fetchCarrierFilteredOrders(
  query: Query,
  carrier: OrderExpeditionCarrierKey,
  limit: number,
  offset: number
): Promise<OrderExpeditionOrdersPage> {
  const accumulator: CarrierFilterAccumulator = {
    matchingCount: 0,
    matchingOrders: [],
  }
  let scanOffset = 0
  let scannedCount = 0
  let scannedAllOrders = false
  let carrierFilterLimitReached = false

  while (true) {
    const remainingScanRows =
      ORDER_EXPEDITION_CARRIER_SCAN_MAX_ROWS - scanOffset
    if (remainingScanRows <= 0) {
      carrierFilterLimitReached = true
      break
    }

    const batch = await fetchCarrierFilterBatch(
      query,
      scanOffset,
      Math.min(ORDER_EXPEDITION_SCAN_BATCH_SIZE, remainingScanRows)
    )

    if (!batch.scannedCount) {
      scannedAllOrders = true
      break
    }

    scannedCount += batch.scannedCount
    collectMatchingCarrierOrders({
      accumulator,
      carrier,
      limit,
      offset,
      orders: batch.orders,
    })
    scanOffset += batch.scannedCount

    if (batch.totalCount <= scanOffset) {
      scannedAllOrders = true
      break
    }

    if (accumulator.matchingOrders.length > limit) {
      break
    }

    if (scanOffset >= ORDER_EXPEDITION_CARRIER_SCAN_MAX_ROWS) {
      carrierFilterLimitReached = true
      break
    }
  }

  return {
    count: accumulator.matchingCount,
    hasNext: accumulator.matchingOrders.length > limit,
    orders: accumulator.matchingOrders.slice(0, limit),
    countExact: scannedAllOrders,
    carrierFilterLimitReached,
    scannedCount,
  }
}

function collectMatchingCarrierOrders({
  accumulator,
  carrier,
  limit,
  offset,
  orders,
}: CollectMatchingCarrierOrdersInput) {
  for (const order of orders) {
    if (!orderMatchesExpeditionCarrier(order, carrier)) {
      continue
    }

    if (accumulator.matchingCount >= offset) {
      accumulator.matchingOrders.push(order)
    }

    accumulator.matchingCount += 1

    if (accumulator.matchingOrders.length > limit) {
      break
    }
  }
}

async function fetchCarrierFilterBatch(
  query: Query,
  offset: number,
  limit: number
): Promise<{
  orders: OrderExpeditionRawOrder[]
  scannedCount: number
  totalCount: number
}> {
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: limit,
    },
  })
  const validOrders = Array.isArray(orders)
    ? orders.filter(isOrderExpeditionRawOrder)
    : []
  const scannedCount = Array.isArray(orders) ? orders.length : 0

  return {
    orders: validOrders,
    scannedCount,
    totalCount: metadata?.count ?? offset + scannedCount,
  }
}
