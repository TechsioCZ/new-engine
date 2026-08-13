import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_NOTE_MODULE } from "../../../../modules/order-note"
import type OrderNoteModuleService from "../../../../modules/order-note/service"
import {
  isActionRequiredOrderBusinessStatusId,
  isPendingUnpaidOrder,
  type OrderBusinessStatusGroupId,
  type OrderBusinessStatusId,
  resolveOrderBusinessStatus,
} from "../../../../utils/order-business-status"
import {
  fetchOrderedOrderExpeditionOrdersByIds,
  isOrderExpeditionRawOrder,
  ORDER_EXPEDITION_DEFAULT_LIMIT,
  ORDER_EXPEDITION_LIST_FIELDS,
  ORDER_EXPEDITION_ORDER_FIELDS,
  type OrderExpeditionCarrierKey,
  type OrderExpeditionRawOrder,
  orderMatchesExpeditionCarrier,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import {
  fetchOrderExpeditionOrderNotesByOrderIds,
  resolveOrderExpeditionCustomerSignals,
} from "../../../../utils/order-expedition-customer-signals"
import type { GetAdminOrderExpeditionOrdersSchemaType } from "../validators"
import {
  getNativeOrderExpeditionSort,
  isNativeOrderExpeditionSort,
  type OrderExpeditionSort,
  parseOrderExpeditionSort,
  sortOrderExpeditionOrders,
} from "./sort"

type OrderExpeditionOrdersPage = {
  carrierFilterLimitReached: boolean
  count: number
  countExact: boolean
  hasNext: boolean
  orders: OrderExpeditionRawOrder[]
  scannedCount: number | null
}
type OrderExpeditionOrderBatch = {
  metadataCount: number | null
  orders: OrderExpeditionRawOrder[]
  scannedCount: number
}
type OrderExpeditionOrderFilters = {
  businessStatusGroup?: OrderBusinessStatusGroupId
  businessStatus?: OrderBusinessStatusId
  carrier?: OrderExpeditionCarrierKey
  pendingUnpaid?: boolean
}
type OrderExpeditionNativeFilters = Pick<
  GetAdminOrderExpeditionOrdersSchemaType,
  "created_at" | "q"
> & {
  status?: "pending"
}
type FetchOrderBatchOptions = {
  fields: string[]
  filters: OrderExpeditionNativeFilters
  limit: number
  offset: number
  order: Record<string, "ASC" | "DESC">
  query: Query
}
type FetchOrdersOptions = {
  filters: OrderExpeditionNativeFilters
  limit: number
  offset: number
  query: Query
  sort: OrderExpeditionSort
}
type FetchProjectedOrdersOptions = FetchOrdersOptions & {
  expeditionFilters: OrderExpeditionOrderFilters
}

const ORDER_EXPEDITION_SCAN_BATCH_SIZE = 500
const ORDER_EXPEDITION_SCAN_MAX_ROWS = 20_000
const ORDER_EXPEDITION_DISPLAY_ID_SEARCH_PATTERN = /^#\d+$/

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderNoteService =
    req.scope.resolve<OrderNoteModuleService>(ORDER_NOTE_MODULE)
  const {
    business_status_group: businessStatusGroup,
    business_status: businessStatus,
    carrier,
    created_at: createdAt,
    limit,
    offset,
    order: sortOrderQuery,
    pending_unpaid: pendingUnpaid,
    q,
  } = req.validatedQuery as GetAdminOrderExpeditionOrdersSchemaType
  const normalizedLimit = limit ?? ORDER_EXPEDITION_DEFAULT_LIMIT
  const normalizedOffset = offset ?? 0
  const normalizedOrder = parseOrderExpeditionSort(sortOrderQuery)
  const filters = {
    businessStatusGroup,
    businessStatus,
    carrier,
    pendingUnpaid,
  }
  const normalizedSearchQuery = normalizeOrderExpeditionSearchQuery(q)
  const nativeFilters: OrderExpeditionNativeFilters = {
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(pendingUnpaid ? { status: "pending" } : {}),
    ...(normalizedSearchQuery ? { q: normalizedSearchQuery } : {}),
  }
  const requiresProjectionScan =
    hasOrderExpeditionFilters(filters) ||
    !isNativeOrderExpeditionSort(normalizedOrder)

  const result = requiresProjectionScan
    ? await fetchProjectedOrders({
        expeditionFilters: filters,
        filters: nativeFilters,
        limit: normalizedLimit,
        offset: normalizedOffset,
        query,
        sort: normalizedOrder,
      })
    : await fetchOrders({
        filters: nativeFilters,
        limit: normalizedLimit,
        offset: normalizedOffset,
        query,
        sort: normalizedOrder,
      })

  const notesByOrderId = await fetchOrderExpeditionOrderNotesByOrderIds(
    orderNoteService,
    result.orders.map((order) => order.id)
  )
  const { signalsByOrderId } = await resolveOrderExpeditionCustomerSignals(
    query,
    result.orders,
    notesByOrderId
  )

  res.json({
    orders: result.orders.map((order) =>
      toOrderExpeditionDto(
        order,
        signalsByOrderId.get(order.id),
        notesByOrderId.get(order.id)
      )
    ),
    count: result.count,
    has_next: result.hasNext,
    count_exact: result.countExact,
    carrier_filter_limit_reached: result.carrierFilterLimitReached,
    scanned_count: result.scannedCount,
    offset: normalizedOffset,
    limit: normalizedLimit,
    order: normalizedOrder.query,
    carrier: carrier ?? null,
    business_status_group: businessStatusGroup ?? null,
    business_status: businessStatus ?? null,
    pending_unpaid: pendingUnpaid ?? false,
  })
}

async function fetchOrders({
  filters,
  limit,
  offset,
  query,
  sort,
}: FetchOrdersOptions): Promise<OrderExpeditionOrdersPage> {
  const batch = await fetchOrderBatch({
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    filters,
    limit,
    offset,
    query,
    order: getNativeOrderExpeditionSort(sort),
  })
  const count = batch.metadataCount ?? batch.orders.length

  return {
    orders: batch.orders,
    count,
    hasNext: offset + limit < count,
    countExact: true,
    carrierFilterLimitReached: false,
    scannedCount: null,
  }
}

async function fetchProjectedOrders({
  expeditionFilters,
  filters,
  limit,
  offset,
  query,
  sort,
}: FetchProjectedOrdersOptions): Promise<OrderExpeditionOrdersPage> {
  const matchingOrders: OrderExpeditionRawOrder[] = []
  let scanOffset = 0
  let scannedCount = 0
  let scanTruncated = false

  while (true) {
    const remainingRows = ORDER_EXPEDITION_SCAN_MAX_ROWS - scanOffset

    if (remainingRows <= 0) {
      scanTruncated = true
      break
    }

    const batchLimit = Math.min(ORDER_EXPEDITION_SCAN_BATCH_SIZE, remainingRows)
    const batch = await fetchOrderBatch({
      fields: ORDER_EXPEDITION_LIST_FIELDS,
      filters,
      limit: batchLimit,
      offset: scanOffset,
      order: { created_at: "DESC", id: "DESC" },
      query,
    })

    if (!batch.scannedCount) {
      scanTruncated =
        batch.metadataCount !== null && batch.metadataCount > scanOffset
      break
    }

    scannedCount += batch.scannedCount
    matchingOrders.push(
      ...batch.orders.filter((candidate) =>
        orderMatchesFilters(candidate, expeditionFilters)
      )
    )
    scanOffset += batch.scannedCount

    const scannedAllOrders =
      batch.metadataCount !== null
        ? batch.metadataCount <= scanOffset
        : batch.scannedCount < batchLimit

    if (scannedAllOrders) {
      break
    }

    if (scanOffset >= ORDER_EXPEDITION_SCAN_MAX_ROWS) {
      scanTruncated = true
      break
    }
  }

  const sortedOrders = sortOrderExpeditionOrders(matchingOrders, sort)
  const pageOrderIds = sortedOrders
    .slice(offset, offset + limit)
    .map((candidate) => candidate.id)
  const { orders } = await fetchOrderedOrderExpeditionOrdersByIds(
    query,
    pageOrderIds
  )

  return {
    count: sortedOrders.length,
    hasNext: offset + limit < sortedOrders.length,
    orders,
    countExact: !scanTruncated,
    carrierFilterLimitReached: scanTruncated,
    scannedCount,
  }
}

function orderMatchesFilters(
  order: OrderExpeditionRawOrder,
  filters: OrderExpeditionOrderFilters
) {
  if (filters.pendingUnpaid && !isPendingUnpaidOrder(order)) {
    return false
  }

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

async function fetchOrderBatch({
  fields,
  filters,
  limit,
  offset,
  order,
  query,
}: FetchOrderBatchOptions): Promise<OrderExpeditionOrderBatch> {
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields,
    filters,
    pagination: {
      order,
      skip: offset,
      take: limit,
    },
  })
  const validOrders = Array.isArray(orders)
    ? orders.filter(isOrderExpeditionRawOrder)
    : []
  const scannedCount = Array.isArray(orders) ? orders.length : 0

  return {
    metadataCount: metadata?.count ?? null,
    orders: validOrders,
    scannedCount,
  }
}

function normalizeOrderExpeditionSearchQuery(query: string | undefined) {
  const normalized = query?.trim()

  if (!normalized) {
    return
  }

  return ORDER_EXPEDITION_DISPLAY_ID_SEARCH_PATTERN.test(normalized)
    ? normalized.slice(1)
    : normalized
}

function hasOrderExpeditionFilters(filters: OrderExpeditionOrderFilters) {
  return Boolean(
    filters.carrier ||
      filters.businessStatus ||
      filters.businessStatusGroup ||
      filters.pendingUnpaid
  )
}
