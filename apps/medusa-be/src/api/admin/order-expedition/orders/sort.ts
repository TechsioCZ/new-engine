import { MedusaError } from "@medusajs/framework/utils"
import {
  ORDER_EXPEDITION_SORT_QUERY_VALUES,
  type OrderExpeditionRawOrder,
  type OrderExpeditionSortField,
  type OrderExpeditionSortQuery,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"

export type OrderExpeditionSort = {
  direction: "ASC" | "DESC"
  field: OrderExpeditionSortField
  query: OrderExpeditionSortQuery
}

type OrderExpeditionSortValue = number | string | null

type SortableOrder = {
  order: OrderExpeditionRawOrder
  value: OrderExpeditionSortValue
}

export const DEFAULT_ORDER_EXPEDITION_SORT: OrderExpeditionSortQuery =
  "-created_at"

const NATIVE_ORDER_EXPEDITION_SORT_FIELDS = new Set<OrderExpeditionSortField>([
  "created_at",
  "display_id",
])
const ORDER_EXPEDITION_SORT_COLLATOR = new Intl.Collator("cs", {
  numeric: true,
  sensitivity: "base",
})

export function parseOrderExpeditionSort(
  order: OrderExpeditionSortQuery | undefined
): OrderExpeditionSort {
  const query = order ?? DEFAULT_ORDER_EXPEDITION_SORT
  const direction = query.startsWith("-") ? "DESC" : "ASC"
  const field = direction === "DESC" ? query.slice(1) : query

  if (!isOrderExpeditionSortField(field)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported order expedition sort field: ${field}`
    )
  }

  return { direction, field, query }
}

export function isNativeOrderExpeditionSort(order: OrderExpeditionSort) {
  return NATIVE_ORDER_EXPEDITION_SORT_FIELDS.has(order.field)
}

export function getNativeOrderExpeditionSort(order: OrderExpeditionSort) {
  return {
    [order.field]: order.direction,
    id: order.direction,
  }
}

export function sortOrderExpeditionOrders(
  orders: OrderExpeditionRawOrder[],
  sort: OrderExpeditionSort
) {
  return orders
    .map(
      (order): SortableOrder => ({
        order,
        value: getOrderExpeditionSortValue(order, sort.field),
      })
    )
    .sort((left, right) => compareSortableOrders(left, right, sort))
    .map(({ order }) => order)
}

function isOrderExpeditionSortField(
  value: string
): value is OrderExpeditionSortField {
  return ORDER_EXPEDITION_SORT_QUERY_VALUES.some(
    (query) => query === value || query === `-${value}`
  )
}

function compareSortableOrders(
  left: SortableOrder,
  right: SortableOrder,
  sort: OrderExpeditionSort
) {
  if (left.value === null || right.value === null) {
    if (left.value === right.value) {
      return compareOrderExpeditionIds(
        left.order.id,
        right.order.id,
        sort.direction
      )
    }

    return left.value === null ? 1 : -1
  }

  const comparison = compareOrderExpeditionSortValues(left.value, right.value)

  if (comparison !== 0) {
    return sort.direction === "DESC" ? -comparison : comparison
  }

  return compareOrderExpeditionIds(
    left.order.id,
    right.order.id,
    sort.direction
  )
}

function getOrderExpeditionSortValue(
  order: OrderExpeditionRawOrder,
  field: OrderExpeditionSortField
): OrderExpeditionSortValue {
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
      return assertNeverSortField(field)
  }
}

function assertNeverSortField(field: never): never {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported order expedition sort field: ${field}`
  )
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
