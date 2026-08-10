import type { MetadataType, Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { getRecordValue } from "@techsio/std/object"

import {
  getManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUS_METADATA_KEY,
  resolveOrderBusinessStatus,
} from "../../../utils/order-business-status"
import type {
  ManualOrderBusinessStatusId,
  OrderBusinessStatusInput,
  OrderBusinessStatusSummary,
} from "../../../utils/order-business-status"

export type OrderBusinessStatusOrder = OrderBusinessStatusInput & {
  created_at?: Date | string | null
  currency_code?: string | null
  custom_display_id?: string | null
  customer_id?: string | null
  display_id?: number | null
  email?: string | null
  id: string
  metadata?: MetadataType
  total?: number | string | null
}

export const ORDER_BUSINESS_STATUS_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "total",
  "currency_code",
  "status",
  "metadata",
  "payment_status",
  "customer_id",
  "payment_collections.status",
  "fulfillment_status",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  // Selecting `total` makes the order module load shipping-method adjustments,
  // and it only selects the shipping method's `version` alongside them when the
  // requested fields already reach into the shipping method. Without this entry
  // the module throws "Shipping method version is required to load adjustments".
  "shipping_methods.id",
]

const isOrderBusinessStatusObjectLike = (value: unknown): value is object =>
  typeof value === "object" && value !== null

const isNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string"

const isNullableDate = (value: unknown) =>
  isNullableString(value) || value instanceof Date

const isNullableTotal = (value: unknown) =>
  isNullableString(value) || typeof value === "number"

const isPaymentCollection = (value: unknown) =>
  isOrderBusinessStatusObjectLike(value) &&
  isNullableString(getRecordValue(value, "status"))

const isFulfillment = (value: unknown) =>
  isOrderBusinessStatusObjectLike(value) &&
  isNullableDate(getRecordValue(value, "canceled_at")) &&
  isNullableDate(getRecordValue(value, "delivered_at")) &&
  isNullableDate(getRecordValue(value, "shipped_at"))

const isNullableRecord = (value: unknown) =>
  value === undefined ||
  value === null ||
  isOrderBusinessStatusObjectLike(value)

const isNullableArrayOf = (
  value: unknown,
  predicate: (item: unknown) => boolean,
) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.every(predicate))

const isOrderBusinessStatusOrder = (
  value: unknown,
): value is OrderBusinessStatusOrder => {
  if (!isOrderBusinessStatusObjectLike(value)) {
    return false
  }

  if (typeof getRecordValue(value, "id") !== "string") {
    return false
  }
  const nullableStrings = [
    getRecordValue(value, "currency_code"),
    getRecordValue(value, "custom_display_id"),
    getRecordValue(value, "customer_id"),
    getRecordValue(value, "email"),
    getRecordValue(value, "fulfillment_status"),
    getRecordValue(value, "payment_status"),
    getRecordValue(value, "status"),
  ]
  if (!nullableStrings.every(isNullableString)) {
    return false
  }
  const displayId = getRecordValue(value, "display_id")
  if (
    displayId !== undefined &&
    displayId !== null &&
    typeof displayId !== "number"
  ) {
    return false
  }
  if (
    !isNullableDate(getRecordValue(value, "created_at")) ||
    !isNullableTotal(getRecordValue(value, "total"))
  ) {
    return false
  }
  if (
    !isNullableArrayOf(getRecordValue(value, "fulfillments"), isFulfillment) ||
    !isNullableArrayOf(
      getRecordValue(value, "payment_collections"),
      isPaymentCollection,
    )
  ) {
    return false
  }
  return isNullableRecord(getRecordValue(value, "metadata"))
}

export const parseOrderBusinessStatusOrders = (
  value: unknown,
): OrderBusinessStatusOrder[] => {
  if (!Array.isArray(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Expected order business status query to return an array",
    )
  }

  return value.map((order, index) => {
    if (!isOrderBusinessStatusOrder(order)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Expected order business status query result at index ${index} to include a string id`,
      )
    }
    return order
  })
}

const normalizeDate = (value: OrderBusinessStatusOrder["created_at"]) =>
  value instanceof Date ? value.toISOString() : (value ?? null)

export const fetchOrderBusinessStatusOrder = async (
  query: Query,
  id: string,
) => {
  const result: unknown = await query.graph({
    entity: "order",
    fields: ORDER_BUSINESS_STATUS_ORDER_FIELDS,
    filters: { id },
  })
  const data: unknown = isOrderBusinessStatusObjectLike(result)
    ? getRecordValue(result, "data")
    : undefined
  const [order] = parseOrderBusinessStatusOrders(data)
  return order
}

export const toOrderBusinessStatusSummary = (
  order: OrderBusinessStatusOrder,
): OrderBusinessStatusSummary => ({
  business_status: resolveOrderBusinessStatus(order),
  created_at: normalizeDate(order.created_at),
  currency_code: order.currency_code ?? null,
  ...(order.custom_display_id === undefined
    ? {}
    : { custom_display_id: order.custom_display_id }),
  display_id: order.display_id ?? null,
  email: order.email ?? null,
  id: order.id,
  manual_status: getManualOrderBusinessStatusId(order) ?? null,
  total: order.total ?? null,
})

export const buildOrderBusinessStatusMetadata = (
  metadata: MetadataType | undefined,
  status: ManualOrderBusinessStatusId | null,
) => ({
  ...metadata,
  [ORDER_BUSINESS_STATUS_METADATA_KEY]: status,
})
