import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

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

const isOrderExpeditionQueryOrder = <T>(
  order: T,
): order is T & OrderExpeditionRawOrder => isOrderExpeditionRawOrder(order)

const fetchOrderBatch = async (
  query: Query,
  offset: number,
  limit: number,
): Promise<OrderExpeditionOrderBatch> => {
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    pagination: {
      skip: offset,
      take: limit,
    },
  })
  const queryOrders = z.array(z.unknown()).parse(orders)
  const validOrders = queryOrders.filter(isOrderExpeditionQueryOrder)
  const scannedCount = queryOrders.length

  return {
    metadataCount: metadata?.count ?? null,
    orders: validOrders,
    scannedCount,
  }
}

const orderMatchesFilters = (
  order: OrderExpeditionRawOrder,
  filters: OrderExpeditionOrderFilters,
) => {
  if (
    filters.carrier !== undefined &&
    !orderMatchesExpeditionCarrier(order, filters.carrier)
  ) {
    return false
  }

  if (
    filters.businessStatus !== undefined ||
    filters.businessStatusGroup !== undefined
  ) {
    const businessStatusId = resolveOrderBusinessStatus(order).id

    if (
      filters.businessStatus !== undefined &&
      businessStatusId !== filters.businessStatus
    ) {
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

const collectMatchingOrders = ({
  accumulator,
  filters,
  limit,
  offset,
  orders,
}: CollectMatchingOrdersInput) => {
  for (const order of orders) {
    if (orderMatchesFilters(order, filters)) {
      if (accumulator.matchingCount >= offset) {
        accumulator.matchingOrders.push(order)
      }
      accumulator.matchingCount += 1

      if (accumulator.matchingOrders.length > limit) {
        return
      }
    }
  }
}

const fetchOrders = async (
  query: Query,
  limit: number,
  offset: number,
): Promise<OrderExpeditionOrdersPage> => {
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

const fetchFilteredOrders = async (
  query: Query,
  filters: OrderExpeditionOrderFilters,
  limit: number,
  offset: number,
): Promise<OrderExpeditionOrdersPage> => {
  const accumulator: CarrierFilterAccumulator = {
    matchingCount: 0,
    matchingOrders: [],
  }
  const scanNext = async (
    scanOffset: number,
    scannedCount: number,
  ): Promise<{
    carrierFilterLimitReached: boolean
    scannedAllOrders: boolean
    scannedCount: number
  }> => {
    const remainingScanRows =
      ORDER_EXPEDITION_CARRIER_SCAN_MAX_ROWS - scanOffset
    if (remainingScanRows <= 0) {
      return {
        carrierFilterLimitReached: true,
        scannedAllOrders: false,
        scannedCount,
      }
    }

    const batch = await fetchOrderBatch(
      query,
      scanOffset,
      Math.min(ORDER_EXPEDITION_SCAN_BATCH_SIZE, remainingScanRows),
    )
    if (batch.scannedCount === 0) {
      return {
        carrierFilterLimitReached: false,
        scannedAllOrders: true,
        scannedCount,
      }
    }

    collectMatchingOrders({
      accumulator,
      filters,
      limit,
      offset,
      orders: batch.orders,
    })
    const nextOffset = scanOffset + batch.scannedCount
    const nextScannedCount = scannedCount + batch.scannedCount
    const totalCount = batch.metadataCount ?? nextOffset
    if (totalCount <= nextOffset) {
      return {
        carrierFilterLimitReached: false,
        scannedAllOrders: true,
        scannedCount: nextScannedCount,
      }
    }
    if (accumulator.matchingOrders.length > limit) {
      return {
        carrierFilterLimitReached: false,
        scannedAllOrders: false,
        scannedCount: nextScannedCount,
      }
    }

    return await scanNext(nextOffset, nextScannedCount)
  }

  const scanResult = await scanNext(0, 0)
  return {
    carrierFilterLimitReached: scanResult.carrierFilterLimitReached,
    count: accumulator.matchingCount,
    countExact: scanResult.scannedAllOrders,
    hasNext: accumulator.matchingOrders.length > limit,
    orders: accumulator.matchingOrders.slice(0, limit),
    scannedCount: scanResult.scannedCount,
  }
}

const get = async (
  req: MedusaRequest<unknown, GetAdminOrderExpeditionOrdersSchemaType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderNoteService =
    req.scope.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
  const {
    business_status_group: businessStatusGroup,
    business_status: businessStatus,
    carrier,
    limit,
    offset,
  } = req.validatedQuery
  const normalizedLimit = limit ?? ORDER_EXPEDITION_DEFAULT_LIMIT
  const normalizedOffset = offset ?? 0

  const result =
    carrier !== undefined ||
    businessStatus !== undefined ||
    businessStatusGroup !== undefined
      ? await fetchFilteredOrders(
          query,
          {
            ...(businessStatusGroup === undefined
              ? {}
              : { businessStatusGroup }),
            ...(businessStatus === undefined ? {} : { businessStatus }),
            ...(carrier === undefined ? {} : { carrier }),
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

export { get as GET }
