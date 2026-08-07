import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_NOTE_MODULE } from "../../../../modules/order-note"
import type OrderNoteModuleService from "../../../../modules/order-note/service"
import {
  isActionRequiredOrderBusinessStatusId,
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
  type OrderExpeditionSortField,
  type OrderExpeditionSortQuery,
  orderMatchesExpeditionCarrier,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import {
  fetchOrderExpeditionOrderNotesByOrderIds,
  resolveOrderExpeditionCustomerSignals,
} from "../../../../utils/order-expedition-customer-signals"
import type { GetAdminOrderExpeditionOrdersSchemaType } from "../validators"

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
}
type OrderExpeditionNativeFilters = Pick<
  GetAdminOrderExpeditionOrdersSchemaType,
  "created_at" | "q"
>
type OrderExpeditionSort = {
  direction: "ASC" | "DESC"
  field: OrderExpeditionSortField
  query: OrderExpeditionSortQuery
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

const ORDER_EXPEDITION_SCAN_BATCH_SIZE = 100
const DEFAULT_ORDER_EXPEDITION_SORT: OrderExpeditionSortQuery = "-created_at"
const ORDER_EXPEDITION_DISPLAY_ID_SEARCH_PATTERN = /^#\d+$/
const NATIVE_ORDER_EXPEDITION_SORT_FIELDS = new Set<OrderExpeditionSortField>([
  "created_at",
  "display_id",
])
const ORDER_EXPEDITION_SORT_COLLATOR = new Intl.Collator("cs", {
  numeric: true,
  sensitivity: "base",
})

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
    q,
  } = req.validatedQuery as GetAdminOrderExpeditionOrdersSchemaType
  const normalizedLimit = limit ?? ORDER_EXPEDITION_DEFAULT_LIMIT
  const normalizedOffset = offset ?? 0
  const normalizedOrder = parseOrderExpeditionSort(sortOrderQuery)
  const filters = {
    businessStatusGroup,
    businessStatus,
    carrier,
  }
  const normalizedSearchQuery = normalizeOrderExpeditionSearchQuery(q)
  const nativeFilters = {
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(normalizedSearchQuery ? { q: normalizedSearchQuery } : {}),
  }
  const requiresProjectionScan =
    hasOrderExpeditionFilters(filters) ||
    !NATIVE_ORDER_EXPEDITION_SORT_FIELDS.has(normalizedOrder.field)

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

  while (true) {
    const batch = await fetchOrderBatch({
      fields: ORDER_EXPEDITION_LIST_FIELDS,
      filters,
      limit: ORDER_EXPEDITION_SCAN_BATCH_SIZE,
      offset: scanOffset,
      order: { created_at: "DESC", id: "DESC" },
      query,
    })

    if (!batch.scannedCount) {
      break
    }

    scannedCount += batch.scannedCount
    matchingOrders.push(
      ...batch.orders.filter((candidate) =>
        orderMatchesFilters(candidate, expeditionFilters)
      )
    )
    scanOffset += batch.scannedCount

    if (
      (batch.metadataCount !== null && batch.metadataCount <= scanOffset) ||
      (batch.metadataCount === null &&
        batch.scannedCount < ORDER_EXPEDITION_SCAN_BATCH_SIZE)
    ) {
      break
    }
  }

  matchingOrders.sort((left, right) =>
    compareOrderExpeditionOrders(left, right, sort)
  )
  const pageOrderIds = matchingOrders
    .slice(offset, offset + limit)
    .map((candidate) => candidate.id)
  const { orders } = await fetchOrderedOrderExpeditionOrdersByIds(
    query,
    pageOrderIds
  )

  return {
    count: matchingOrders.length,
    hasNext: offset + limit < matchingOrders.length,
    orders,
    countExact: true,
    carrierFilterLimitReached: false,
    scannedCount,
  }
}

function orderMatchesFilters(
  order: OrderExpeditionRawOrder,
  filters: OrderExpeditionOrderFilters
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
    filters.carrier || filters.businessStatus || filters.businessStatusGroup
  )
}

function parseOrderExpeditionSort(
  order: OrderExpeditionSortQuery | undefined
): OrderExpeditionSort {
  const query = order ?? DEFAULT_ORDER_EXPEDITION_SORT
  const descending = query.startsWith("-")

  return {
    direction: descending ? "DESC" : "ASC",
    field: (descending ? query.slice(1) : query) as OrderExpeditionSortField,
    query,
  }
}

function getNativeOrderExpeditionSort(order: OrderExpeditionSort) {
  return {
    [order.field]: order.direction,
    id: order.direction,
  }
}

function compareOrderExpeditionOrders(
  left: OrderExpeditionRawOrder,
  right: OrderExpeditionRawOrder,
  order: OrderExpeditionSort
) {
  const leftValue = getOrderExpeditionSortValue(left, order.field)
  const rightValue = getOrderExpeditionSortValue(right, order.field)

  if (leftValue === null || rightValue === null) {
    if (leftValue === rightValue) {
      return compareOrderExpeditionIds(left.id, right.id, order.direction)
    }

    return leftValue === null ? 1 : -1
  }

  const comparison = compareOrderExpeditionSortValues(leftValue, rightValue)

  if (comparison !== 0) {
    return order.direction === "DESC" ? -comparison : comparison
  }

  return compareOrderExpeditionIds(left.id, right.id, order.direction)
}

function getOrderExpeditionSortValue(
  order: OrderExpeditionRawOrder,
  field: OrderExpeditionSortField
): number | string | null {
  const dto = toOrderExpeditionDto(order)

  switch (field) {
    case "created_at": {
      const createdAt = dto.created_at ? Date.parse(dto.created_at) : Number.NaN
      return Number.isNaN(createdAt) ? null : createdAt
    }
    case "display_id":
      return dto.display_id ?? null
    case "customer":
      return dto.customer
    case "carrier":
      return dto.carrier.label
    case "business_status":
      return dto.business_status.priority
    case "fulfillment":
      return (
        dto.fulfillment_status ??
        (dto.has_active_fulfillment ? "active" : "none")
      )
    case "payment": {
      const payment = [dto.payment_status, dto.payment_method]
        .filter(Boolean)
        .join(" ")
      return payment || null
    }
    case "total": {
      if (dto.total === null || dto.total === undefined) {
        return null
      }

      const total = Number(dto.total)
      return Number.isNaN(total) ? null : total
    }
    default:
      return null
  }
}

function compareOrderExpeditionSortValues(
  left: number | string,
  right: number | string
) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }

  return ORDER_EXPEDITION_SORT_COLLATOR.compare(String(left), String(right))
}

function compareOrderExpeditionIds(
  left: string,
  right: string,
  direction: OrderExpeditionSort["direction"]
) {
  const comparison = ORDER_EXPEDITION_SORT_COLLATOR.compare(left, right)
  return direction === "DESC" ? -comparison : comparison
}
