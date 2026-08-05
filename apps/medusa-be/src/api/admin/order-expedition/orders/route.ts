import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ORDER_NOTE_MODULE } from "../../../../modules/order-note"
import type OrderNoteModuleService from "../../../../modules/order-note/service"
import {
  isActionRequiredOrderBusinessStatusId,
  resolveOrderBusinessStatus,
} from "../../../../utils/order-business-status"
import type {
  OrderBusinessStatusGroupId,
  OrderBusinessStatusId,
} from "../../../../utils/order-business-status"
import {
  isOrderExpeditionRawOrder,
  ORDER_EXPEDITION_DEFAULT_LIMIT,
  ORDER_EXPEDITION_ORDER_FIELDS,
  orderMatchesExpeditionCarrier,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import type {
  OrderExpeditionCarrierKey,
  OrderExpeditionRawOrder,
} from "../../../../utils/order-expedition"
import {
  fetchOrderExpeditionOrderNotesByOrderIds,
  resolveOrderExpeditionCustomerSignals,
} from "../../../../utils/order-expedition-customer-signals"
import type { GetAdminOrderExpeditionOrdersSchemaType } from "../validators"

interface OrderExpeditionOrdersPage {
  carrierFilterLimitReached: boolean
  count: number
  countExact: boolean
  hasNext: boolean
  orders: OrderExpeditionRawOrder[]
  scannedCount: number | null
}
interface OrderExpeditionOrderBatch {
  metadataCount: number | null
  orders: OrderExpeditionRawOrder[]
  scannedCount: number
}
interface CarrierFilterAccumulator {
  matchingCount: number
  matchingOrders: OrderExpeditionRawOrder[]
}
interface OrderExpeditionOrderFilters {
  businessStatusGroup?: OrderBusinessStatusGroupId
  businessStatus?: OrderBusinessStatusId
  carrier?: OrderExpeditionCarrierKey
}
interface CollectMatchingOrdersInput {
  accumulator: CarrierFilterAccumulator
  filters: OrderExpeditionOrderFilters
  limit: number
  offset: number
  orders: OrderExpeditionRawOrder[]
}

const ORDER_EXPEDITION_SCAN_BATCH_SIZE = 100
const ORDER_EXPEDITION_CARRIER_SCAN_MAX_ROWS = 1000

function isOrderExpeditionQueryOrder<T>(
  order: T,
): order is T & OrderExpeditionRawOrder {
  return isOrderExpeditionRawOrder(order)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderNoteService =
    req.scope.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
  const {
    business_status_group: businessStatusGroup,
    business_status: businessStatus,
    carrier,
    limit,
    offset,
  } = req.validatedQuery as GetAdminOrderExpeditionOrdersSchemaType
  const normalizedLimit = limit ?? ORDER_EXPEDITION_DEFAULT_LIMIT
  const normalizedOffset = offset ?? 0

  const result =
    carrier || businessStatus || businessStatusGroup
      ? await fetchFilteredOrders(
          query,
          {
            ...(businessStatusGroup ? { businessStatusGroup } : {}),
            ...(businessStatus ? { businessStatus } : {}),
            ...(carrier ? { carrier } : {}),
          },
          normalizedLimit,
          normalizedOffset,
        )
      : await fetchOrders(query, normalizedLimit, normalizedOffset)

  const notesByOrderId = await fetchOrderExpeditionOrderNotesByOrderIds(
    orderNoteService,
    result.orders.map((order) => order.id),
  )
  const { signalsByOrderId } = await resolveOrderExpeditionCustomerSignals(
    query,
    result.orders,
    notesByOrderId,
  )

  res.json({
    business_status: businessStatus ?? null,
    business_status_group: businessStatusGroup ?? null,
    carrier: carrier ?? null,
    carrier_filter_limit_reached: result.carrierFilterLimitReached,
    count: result.count,
    count_exact: result.countExact,
    has_next: result.hasNext,
    limit: normalizedLimit,
    offset: normalizedOffset,
    orders: result.orders.map((order) =>
      toOrderExpeditionDto(
        order,
        signalsByOrderId.get(order.id),
        notesByOrderId.get(order.id),
      ),
    ),
    scanned_count: result.scannedCount,
  })
}

async function fetchOrders(
  query: Query,
  limit: number,
  offset: number,
): Promise<OrderExpeditionOrdersPage> {
  const batch = await fetchOrderBatch(query, offset, limit)
  const count = batch.metadataCount ?? batch.orders.length

  return {
    carrierFilterLimitReached: false,
    count,
    countExact: true,
    hasNext: offset + limit < count,
    orders: batch.orders,
    scannedCount: null,
  }
}

async function fetchFilteredOrders(
  query: Query,
  filters: OrderExpeditionOrderFilters,
  limit: number,
  offset: number,
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

    const batch = await fetchOrderBatch(
      query,
      scanOffset,
      Math.min(ORDER_EXPEDITION_SCAN_BATCH_SIZE, remainingScanRows),
    )

    if (!batch.scannedCount) {
      scannedAllOrders = true
      break
    }

    scannedCount += batch.scannedCount
    collectMatchingOrders({
      accumulator,
      filters,
      limit,
      offset,
      orders: batch.orders,
    })
    scanOffset += batch.scannedCount

    const totalCount = batch.metadataCount ?? scanOffset
    if (totalCount <= scanOffset) {
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
    carrierFilterLimitReached,
    count: accumulator.matchingCount,
    countExact: scannedAllOrders,
    hasNext: accumulator.matchingOrders.length > limit,
    orders: accumulator.matchingOrders.slice(0, limit),
    scannedCount,
  }
}

function collectMatchingOrders({
  accumulator,
  filters,
  limit,
  offset,
  orders,
}: CollectMatchingOrdersInput) {
  for (const order of orders) {
    if (!orderMatchesFilters(order, filters)) {
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

function orderMatchesFilters(
  order: OrderExpeditionRawOrder,
  filters: OrderExpeditionOrderFilters,
) {
  if (
    filters.carrier &&
    !orderMatchesExpeditionCarrier(order, filters.carrier)
  ) {
    return false
  }

  if (filters.businessStatus || filters.businessStatusGroup) {
    const businessStatusId = resolveOrderBusinessStatus(order).id

    if (filters.businessStatus && businessStatusId !== filters.businessStatus) {
      return false
    }

    if (
      filters.businessStatusGroup === "action_required" &&
      !isActionRequiredOrderBusinessStatusId(businessStatusId)
    ) {
      return false
    }
  }

  return true
}

async function fetchOrderBatch(
  query: Query,
  offset: number,
  limit: number,
): Promise<OrderExpeditionOrderBatch> {
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: limit,
    },
  })
  const validOrders = Array.isArray(orders)
    ? orders.filter(isOrderExpeditionQueryOrder)
    : []
  const scannedCount = Array.isArray(orders) ? orders.length : 0

  return {
    metadataCount: metadata?.count ?? null,
    orders: validOrders,
    scannedCount,
  }
}
