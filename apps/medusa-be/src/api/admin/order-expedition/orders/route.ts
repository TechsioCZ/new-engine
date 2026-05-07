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

const ORDER_EXPEDITION_SCAN_BATCH_SIZE = 100

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
  const orders: OrderExpeditionRawOrder[] = []
  let count = 0
  let scanOffset = 0

  while (true) {
    const batch = await fetchOrderBatch(query, scanOffset)

    if (!batch.orders.length) {
      break
    }

    for (const order of batch.orders) {
      if (!orderMatchesExpeditionCarrier(order, carrier)) {
        continue
      }

      if (count >= offset && orders.length < limit) {
        orders.push(order)
      }

      count += 1
    }

    scanOffset += ORDER_EXPEDITION_SCAN_BATCH_SIZE

    if (batch.totalCount <= scanOffset) {
      break
    }
  }

  return { orders, count }
}

async function fetchOrderBatch(
  query: Query,
  offset: number
): Promise<{ orders: OrderExpeditionRawOrder[]; totalCount: number }> {
  const { data: orders, metadata } = (await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: ORDER_EXPEDITION_SCAN_BATCH_SIZE,
    },
  })) as OrderGraphResult

  return {
    orders: orders as OrderExpeditionRawOrder[],
    totalCount: metadata?.count ?? offset + orders.length,
  }
}
