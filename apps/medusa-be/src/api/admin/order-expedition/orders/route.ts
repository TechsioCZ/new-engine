import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ORDER_EXPEDITION_DEFAULT_LIMIT,
  ORDER_EXPEDITION_ORDER_FIELDS,
  type OrderExpeditionCarrierKey,
  type OrderExpeditionRawOrder,
  orderMatchesExpeditionCarrier,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import type { GetAdminOrderExpeditionOrdersSchemaType } from "../validators"

type OrderGraphResult = Awaited<ReturnType<Query["graph"]>>
type OrderExpeditionCarrierFilterOrder = Pick<
  OrderExpeditionRawOrder,
  "id" | "shipping_methods"
>
type CarrierFilterAccumulator = {
  matchingCount: number
  matchingOrderIds: string[]
}
type CollectMatchingCarrierOrderIdsInput = {
  accumulator: CarrierFilterAccumulator
  carrier: OrderExpeditionCarrierKey
  limit: number
  offset: number
  orders: OrderExpeditionCarrierFilterOrder[]
}

const ORDER_EXPEDITION_SCAN_BATCH_SIZE = 100
const ORDER_EXPEDITION_CARRIER_FILTER_FIELDS = [
  "id",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
]

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
    offset: normalizedOffset,
    limit: normalizedLimit,
    carrier: carrier ?? null,
  })
}

async function fetchOrders(
  query: Query,
  limit: number,
  offset: number
): Promise<{ orders: OrderExpeditionRawOrder[]; count: number }> {
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: limit,
    },
  })

  return {
    orders: orders as OrderExpeditionRawOrder[],
    count: metadata?.count ?? orders.length,
  }
}

async function fetchCarrierFilteredOrders(
  query: Query,
  carrier: OrderExpeditionCarrierKey,
  limit: number,
  offset: number
): Promise<{ orders: OrderExpeditionRawOrder[]; count: number }> {
  const { count, pageOrderIds } = await fetchCarrierFilteredOrderIdPage(
    query,
    carrier,
    limit,
    offset
  )

  if (!pageOrderIds.length) {
    return { orders: [], count }
  }

  const orders = await fetchOrdersByIds(query, pageOrderIds)

  return { orders, count }
}

async function fetchCarrierFilteredOrderIdPage(
  query: Query,
  carrier: OrderExpeditionCarrierKey,
  limit: number,
  offset: number
): Promise<{ pageOrderIds: string[]; count: number }> {
  const accumulator: CarrierFilterAccumulator = {
    matchingCount: 0,
    matchingOrderIds: [],
  }
  let scanOffset = 0

  while (true) {
    const batch = await fetchCarrierFilterBatch(query, scanOffset)

    if (!batch.orders.length) {
      break
    }

    collectMatchingCarrierOrderIds({
      accumulator,
      carrier,
      limit,
      offset,
      orders: batch.orders,
    })
    scanOffset += ORDER_EXPEDITION_SCAN_BATCH_SIZE

    if (
      shouldStopCarrierFilterScan(
        batch.totalCount,
        scanOffset,
        accumulator.matchingOrderIds.length,
        limit
      )
    ) {
      break
    }
  }

  return {
    count: getCarrierFilteredCount(accumulator, offset, limit),
    pageOrderIds: accumulator.matchingOrderIds.slice(0, limit),
  }
}

function collectMatchingCarrierOrderIds({
  accumulator,
  carrier,
  limit,
  offset,
  orders,
}: CollectMatchingCarrierOrderIdsInput) {
  for (const order of orders) {
    if (!orderMatchesExpeditionCarrier(order, carrier)) {
      continue
    }

    if (accumulator.matchingCount >= offset) {
      accumulator.matchingOrderIds.push(order.id)
    }

    accumulator.matchingCount += 1

    if (accumulator.matchingOrderIds.length > limit) {
      break
    }
  }
}

function shouldStopCarrierFilterScan(
  totalCount: number,
  scanOffset: number,
  matchingOrderIdsLength: number,
  limit: number
) {
  return totalCount <= scanOffset || matchingOrderIdsLength > limit
}

function getCarrierFilteredCount(
  accumulator: CarrierFilterAccumulator,
  offset: number,
  limit: number
) {
  if (accumulator.matchingOrderIds.length > limit) {
    return offset + limit + 1
  }

  return accumulator.matchingCount
}

async function fetchOrdersByIds(
  query: Query,
  orderIds: string[]
): Promise<OrderExpeditionRawOrder[]> {
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    filters: { id: orderIds },
  })

  const ordersById = new Map(
    (orders as OrderExpeditionRawOrder[]).map((order) => [order.id, order])
  )

  return orderIds.flatMap((orderId) => {
    const order = ordersById.get(orderId)
    return order ? [order] : []
  })
}

async function fetchCarrierFilterBatch(
  query: Query,
  offset: number
): Promise<{
  orders: OrderExpeditionCarrierFilterOrder[]
  totalCount: number
}> {
  const { data: orders, metadata } = (await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_CARRIER_FILTER_FIELDS,
    pagination: {
      skip: offset,
      take: ORDER_EXPEDITION_SCAN_BATCH_SIZE,
    },
  })) as OrderGraphResult

  return {
    orders: orders as OrderExpeditionCarrierFilterOrder[],
    totalCount: metadata?.count ?? offset + orders.length,
  }
}
