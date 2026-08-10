import type {
  FulfillmentDTO,
  MetadataType,
  OrderShippingMethodDTO,
  Query,
} from "@medusajs/framework/types"
import { getRecordValue, isRecord } from "@techsio/std/object"

import {
  getManualOrderBusinessStatusId,
  resolveOrderBusinessStatus,
} from "./order-business-status"
import type {
  ManualOrderBusinessStatusId,
  OrderBusinessStatus,
} from "./order-business-status"

export interface OrderExpeditionGraph {
  graph: (input: Parameters<Query["graph"]>[0]) => Promise<unknown>
}

export const ORDER_EXPEDITION_MAX_ORDER_IDS = 1000
export const ORDER_EXPEDITION_DEFAULT_LIMIT = 50
export const ORDER_EXPEDITION_MAX_LIMIT = 100

export const ORDER_EXPEDITION_CARRIER_KEYS = [
  "gls",
  "ppl",
  "packeta",
  "other",
] as const
export const ORDER_EXPEDITION_TARGET_STATUSES = [
  "pending",
  "completed",
  "draft",
  "archived",
  "canceled",
  "requires_action",
] as const

const ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS = {
  archived: [],
  canceled: ["archived"],
  completed: ["archived"],
  draft: ["pending", "requires_action", "completed", "canceled", "archived"],
  pending: ["draft", "requires_action", "completed", "canceled"],
  requires_action: ["draft", "pending", "completed", "canceled"],
} as const satisfies Record<
  OrderExpeditionTargetStatus,
  readonly OrderExpeditionTargetStatus[]
>

export type OrderExpeditionCarrierKey =
  (typeof ORDER_EXPEDITION_CARRIER_KEYS)[number]

export type OrderExpeditionTargetStatus =
  (typeof ORDER_EXPEDITION_TARGET_STATUSES)[number]

export interface OrderExpeditionCarrierOption {
  label: string
  value: OrderExpeditionCarrierKey
}

interface OrderExpeditionAddress {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  province?: string | null
  country_code?: string | null
  phone?: string | null
}

interface OrderExpeditionShippingMethod {
  id?: string | null
  name?: string | null
  shipping_option_id?: string | null
  data?: OrderShippingMethodDTO["data"] | null
}

type OrderExpeditionNumericValue = number | string

interface OrderExpeditionQuantityValue {
  value?: OrderExpeditionNumericValue | null
}

type OrderExpeditionDateValue = Date | string

type OrderExpeditionNullable<T> = T | null

type OrderExpeditionOptional<T> = T | undefined

type OrderExpeditionMaybe<T> = OrderExpeditionOptional<
  OrderExpeditionNullable<T>
>

type OrderExpeditionSummaryCollection =
  | OrderExpeditionSummary
  | OrderExpeditionSummary[]

type OrderExpeditionAmountValue =
  | OrderExpeditionNumericValue
  | OrderExpeditionAmountLike

type OrderExpeditionAmountInput = OrderExpeditionMaybe<
  OrderExpeditionAmountValue | OrderExpeditionRawAmount
>

interface OrderExpeditionLineItem {
  id?: string | null
  title?: string | null
  subtitle?: string | null
  thumbnail?: string | null
  quantity?: OrderExpeditionNullable<
    OrderExpeditionNumericValue | OrderExpeditionQuantityValue
  >
  raw_quantity?: OrderExpeditionRawAmount | null
  detail?: {
    quantity?: OrderExpeditionNumericValue | null
    raw_quantity?: OrderExpeditionRawAmount | null
  } | null
  unit_price?: OrderExpeditionNullable<OrderExpeditionAmountValue>
  raw_unit_price?: OrderExpeditionRawAmount | null
  variant_id?: string | null
  variant_sku?: string | null
  variant_title?: string | null
}

interface OrderExpeditionPayment {
  provider_id?: string | null
}

interface OrderExpeditionPaymentCollection {
  status?: string | null
  payments?: OrderExpeditionPayment[] | null
}

interface OrderExpeditionRawAmount {
  value?: OrderExpeditionNumericValue | null
}

interface OrderExpeditionAmountLike {
  valueOf: () => unknown
}

interface OrderExpeditionSummaryTotals {
  current_order_total?: OrderExpeditionNumericValue | null
  original_order_total?: OrderExpeditionNumericValue | null
  raw_current_order_total?: OrderExpeditionRawAmount | null
  raw_original_order_total?: OrderExpeditionRawAmount | null
}

interface OrderExpeditionSummary {
  current_order_total?: OrderExpeditionNumericValue | null
  original_order_total?: OrderExpeditionNumericValue | null
  raw_current_order_total?: OrderExpeditionRawAmount | null
  raw_original_order_total?: OrderExpeditionRawAmount | null
  totals?: OrderExpeditionSummaryTotals | null
  version?: OrderExpeditionNumericValue | null
}

interface OrderExpeditionFulfillment {
  id?: string | null
  canceled_at?: string | null
  data?: FulfillmentDTO["data"]
  delivered_at?: OrderExpeditionDateValue | null
  provider_id?: string | null
  shipped_at?: OrderExpeditionDateValue | null
}

interface OrderExpeditionCustomer {
  id?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  company_name?: string | null
}

export interface OrderExpeditionRawOrder {
  id: string
  created_at?: OrderExpeditionDateValue | null
  currency_code?: string | null
  display_id?: number | null
  custom_display_id?: string | null
  email?: string | null
  status?: string | null
  is_draft_order?: boolean | null
  fulfillment_status?: string | null
  metadata?: MetadataType
  payment_status?: string | null
  summary?: OrderExpeditionSummaryCollection | null
  total?: OrderExpeditionNullable<OrderExpeditionAmountValue>
  customer_id?: string | null
  customer?: OrderExpeditionCustomer | null
  shipping_address?: OrderExpeditionAddress | null
  shipping_methods?: OrderExpeditionShippingMethod[] | null
  fulfillments?: OrderExpeditionFulfillment[] | null
  items?: OrderExpeditionLineItem[] | null
  payment_collections?: OrderExpeditionPaymentCollection[] | null
}

export type ResolvedOrderExpeditionCarrier = OrderExpeditionCarrierOption & {
  shipping_method_id?: string
  shipping_method_name?: string
  shipping_option_id?: string
}

export interface OrderExpeditionItemDto {
  id?: string | null
  title: string
  quantity: number
  sku?: string | null
  stock_quantity?: number | null
  thumbnail?: string | null
  unit_price?: OrderExpeditionNumericValue | null
  variant?: string | null
  variant_id?: string | null
}

export interface OrderExpeditionCustomerSignals {
  note: boolean
  returning_customer: boolean
  storn_orders: boolean
}

export interface OrderExpeditionOrderDto {
  id: string
  business_status: OrderBusinessStatus
  created_at?: string | null
  currency_code?: string | null
  display_id?: number | null
  order_display_id: string
  customer: string
  email?: string | null
  delivery_address: string[]
  carrier: ResolvedOrderExpeditionCarrier
  payment_method: string
  payment_status?: string | null
  fulfillment_status?: string | null
  status?: string | null
  manual_status?: ManualOrderBusinessStatusId | null
  packeta_barcode?: string | null
  total?: OrderExpeditionNumericValue | null
  has_active_fulfillment: boolean
  items: OrderExpeditionItemDto[]
  note?: string | null
  signals: OrderExpeditionCustomerSignals
}

export interface OrderExpeditionBlockingOrder {
  id: string
  order_display_id: string
  reason: string
}

interface OrderExpeditionTransitionOrder {
  status?: string | null
  fulfillments?: OrderExpeditionFulfillment[] | null
  has_active_fulfillment?: boolean | null
}

export const ORDER_EXPEDITION_CARRIER_OPTIONS: OrderExpeditionCarrierOption[] =
  [
    { label: "GLS", value: "gls" },
    { label: "PPL", value: "ppl" },
    { label: "Packeta", value: "packeta" },
    { label: "Other", value: "other" },
  ]

export const ORDER_EXPEDITION_ORDER_FIELDS = [
  "id",
  "created_at",
  "currency_code",
  "display_id",
  "custom_display_id",
  "email",
  "status",
  "is_draft_order",
  "fulfillment_status",
  "metadata",
  "payment_status",
  "summary.*",
  "total",
  "customer_id",
  "customer.id",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "customer.company_name",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.postal_code",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.country_code",
  "shipping_address.phone",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
  "fulfillments.id",
  "fulfillments.canceled_at",
  "fulfillments.data",
  "fulfillments.provider_id",
  "fulfillments.delivered_at",
  "fulfillments.shipped_at",
  "items.id",
  "items.title",
  "items.subtitle",
  "items.thumbnail",
  "items.quantity",
  "items.raw_quantity",
  "items.detail.quantity",
  "items.detail.raw_quantity",
  "items.unit_price",
  "items.raw_unit_price",
  "items.variant_id",
  "items.variant_sku",
  "items.variant_title",
  "payment_collections.status",
  "payment_collections.payments.provider_id",
]

const CARRIER_MATCHERS: Record<
  Exclude<OrderExpeditionCarrierKey, "other">,
  { label: string; tokens: string[] }
> = {
  gls: {
    label: "GLS",
    tokens: ["gls"],
  },
  packeta: {
    label: "Packeta",
    tokens: ["packeta", "zasilkovna", "zasielkovna"],
  },
  ppl: {
    label: "PPL",
    tokens: ["ppl"],
  },
}
const CARRIER_TOKEN_SEPARATOR_REGEX = /[^a-z0-9]+/u

export const getOrderExpeditionDisplayId = (
  order: Pick<
    OrderExpeditionRawOrder,
    "custom_display_id" | "display_id" | "id"
  >,
) => {
  if (
    order.custom_display_id !== null &&
    order.custom_display_id !== undefined &&
    order.custom_display_id !== ""
  ) {
    return order.custom_display_id
  }

  return `#${order.display_id ?? order.id}`
}

export const isOrderExpeditionCarrierKey = (
  value: string,
): value is OrderExpeditionCarrierKey =>
  ORDER_EXPEDITION_CARRIER_KEYS.some((carrier) => carrier === value)

export const isOrderExpeditionTargetStatus = (
  value: string,
): value is OrderExpeditionTargetStatus =>
  ORDER_EXPEDITION_TARGET_STATUSES.some((status) => status === value)

export const isOrderExpeditionRawOrder = (
  value: unknown,
): value is OrderExpeditionRawOrder =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string"

const hasOrderExpeditionActiveFulfillment = (
  order: Pick<
    OrderExpeditionTransitionOrder,
    "fulfillments" | "has_active_fulfillment"
  >,
) => {
  if (typeof order.has_active_fulfillment === "boolean") {
    return order.has_active_fulfillment
  }

  return Boolean(
    order.fulfillments?.some(
      (fulfillment) =>
        fulfillment.canceled_at === null ||
        fulfillment.canceled_at === undefined,
    ),
  )
}

export const toOrderExpeditionBlockingOrder = (
  order: Pick<
    OrderExpeditionRawOrder,
    "id" | "custom_display_id" | "display_id"
  >,
  reason: string,
): OrderExpeditionBlockingOrder => ({
  id: order.id,
  order_display_id: getOrderExpeditionDisplayId(order),
  reason,
})

export const findMissingOrderIds = (
  requestedOrderIds: string[],
  orders: Pick<OrderExpeditionRawOrder, "id">[],
) => {
  const orderIds = new Set(orders.map((order) => order.id))
  return requestedOrderIds.filter((orderId) => !orderIds.has(orderId))
}

export const orderOrdersByRequestedIds = <T extends { id: string }>(
  requestedOrderIds: string[],
  orders: T[],
) => {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  return requestedOrderIds
    .map((orderId) => ordersById.get(orderId))
    .filter((order): order is T => Boolean(order))
}

const fetchOrderExpeditionOrdersByIds = async (
  query: OrderExpeditionGraph,
  orderIds: string[],
) => {
  const graphResult = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    filters: {
      id: orderIds,
    },
  })
  const data = isRecord(graphResult)
    ? getRecordValue(graphResult, "data")
    : undefined

  return Array.isArray(data) ? data.filter(isOrderExpeditionRawOrder) : []
}

export const fetchOrderedOrderExpeditionOrdersByIds = async (
  query: OrderExpeditionGraph,
  orderIds: string[],
) => {
  const orders = await fetchOrderExpeditionOrdersByIds(query, orderIds)

  return {
    missingOrderIds: findMissingOrderIds(orderIds, orders),
    orders: orderOrdersByRequestedIds(orderIds, orders),
  }
}

const getOrderExpeditionPacketaBarcode = (
  fulfillments?: OrderExpeditionFulfillment[] | null,
) => {
  const packetaFulfillment = fulfillments?.find(
    (fulfillment) =>
      fulfillment.provider_id?.toLowerCase().includes("packeta") === true &&
      (fulfillment.canceled_at === null ||
        fulfillment.canceled_at === undefined),
  )
  const barcode = packetaFulfillment?.data?.["barcode"]
  const barcodeText = packetaFulfillment?.data?.["barcodeText"]
  const packetId = packetaFulfillment?.data?.["packet_id"]

  if (typeof barcode === "string" && barcode.trim()) {
    return barcode.trim()
  }

  if (typeof barcodeText === "string" && barcodeText.trim()) {
    return barcodeText.trim()
  }

  if (typeof packetId === "number" || typeof packetId === "string") {
    return String(packetId)
  }

  return null
}

const getOrderExpeditionPaymentMethod = (order: OrderExpeditionRawOrder) => {
  const providerId = order.payment_collections
    ?.flatMap((collection) => collection.payments ?? [])
    .find(
      (payment) =>
        payment.provider_id !== null && payment.provider_id !== undefined,
    )?.provider_id

  return providerId ?? order.payment_status ?? "Unknown"
}

const getOrderExpeditionSummaryVersion = (summary: OrderExpeditionSummary) => {
  const version = Number(summary.version ?? 0)

  return Number.isFinite(version) ? version : 0
}

const normalizeOrderExpeditionAmount = (
  value: OrderExpeditionAmountInput,
): OrderExpeditionOptional<OrderExpeditionNumericValue> => {
  if (typeof value === "object" && value !== null) {
    if ("value" in value) {
      return normalizeOrderExpeditionAmount(value.value)
    }

    const primitive = value.valueOf()

    if (typeof primitive === "number" || typeof primitive === "string") {
      return normalizeOrderExpeditionAmount(primitive)
    }

    return undefined
  }

  const amount = value

  return amount === "" || amount === null || amount === undefined
    ? undefined
    : amount
}

const isNonZeroAmount = (value: number | string | undefined) => {
  const amount = Number(value)

  return Number.isFinite(amount) && amount !== 0
}

const getOrderExpeditionSummaryAmount = (
  amount: OrderExpeditionNumericValue | null | undefined,
  rawAmount: OrderExpeditionRawAmount | null | undefined,
) => {
  const normalizedAmount = normalizeOrderExpeditionAmount(amount)
  const normalizedRawAmount = normalizeOrderExpeditionAmount(rawAmount)

  if (isNonZeroAmount(normalizedAmount) || normalizedRawAmount === undefined) {
    return normalizedAmount
  }

  return normalizedRawAmount
}

const getLatestOrderExpeditionSummaryTotal = (
  summary: OrderExpeditionRawOrder["summary"],
): OrderExpeditionOptional<OrderExpeditionNumericValue> => {
  let summaryEntries: OrderExpeditionSummary[]

  if (Array.isArray(summary)) {
    summaryEntries = summary
  } else if (summary) {
    summaryEntries = [summary]
  } else {
    summaryEntries = []
  }

  const summaries = summaryEntries.toSorted(
    (left, right) =>
      getOrderExpeditionSummaryVersion(right) -
      getOrderExpeditionSummaryVersion(left),
  )

  let resolvedAmount: OrderExpeditionOptional<OrderExpeditionNumericValue>

  for (const entry of summaries) {
    const amount =
      getOrderExpeditionSummaryAmount(
        entry.current_order_total,
        entry.raw_current_order_total,
      ) ??
      getOrderExpeditionSummaryAmount(
        entry.totals?.current_order_total,
        entry.totals?.raw_current_order_total,
      ) ??
      getOrderExpeditionSummaryAmount(
        entry.original_order_total,
        entry.raw_original_order_total,
      ) ??
      getOrderExpeditionSummaryAmount(
        entry.totals?.original_order_total,
        entry.totals?.raw_original_order_total,
      )

    if (amount !== undefined) {
      resolvedAmount = amount
      break
    }
  }

  return resolvedAmount
}

const getOrderExpeditionTotal = (order: OrderExpeditionRawOrder) => {
  const summaryTotal = getLatestOrderExpeditionSummaryTotal(order.summary)
  const orderTotal = normalizeOrderExpeditionAmount(order.total)

  if (isNonZeroAmount(orderTotal) || summaryTotal === undefined) {
    return orderTotal ?? null
  }

  return summaryTotal
}

export const getOrderExpeditionNote = (metadata?: MetadataType) => {
  if (!metadata) {
    return null
  }

  for (const key of ["note", "notes", "customer_note", "comment"]) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}

const getOrderExpeditionItemQuantity = (
  quantity: OrderExpeditionLineItem["quantity"],
) => {
  const value =
    typeof quantity === "object" && quantity !== null && "value" in quantity
      ? quantity.value
      : quantity
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const toOrderExpeditionItemDto = (
  item: OrderExpeditionLineItem,
): OrderExpeditionItemDto => {
  const quantity = getOrderExpeditionItemQuantity(
    item.detail?.quantity ??
      item.detail?.raw_quantity ??
      item.quantity ??
      item.raw_quantity,
  )

  return {
    ...(item.id === undefined ? {} : { id: item.id }),
    quantity,
    ...(item.variant_sku === undefined ? {} : { sku: item.variant_sku }),
    ...(item.thumbnail === undefined ? {} : { thumbnail: item.thumbnail }),
    title: item.title ?? item.subtitle ?? item.id ?? "Untitled item",
    unit_price:
      normalizeOrderExpeditionAmount(item.unit_price) ??
      normalizeOrderExpeditionAmount(item.raw_unit_price) ??
      null,
    ...(item.variant_title === undefined
      ? {}
      : { variant: item.variant_title }),
    ...(item.variant_id === undefined ? {} : { variant_id: item.variant_id }),
  }
}

const joinNonEmpty = (values: (string | null | undefined)[]) =>
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ")

const getOrderExpeditionCustomerName = (order: OrderExpeditionRawOrder) => {
  const customerName = joinNonEmpty([
    order.customer?.company_name,
    order.customer?.first_name,
    order.customer?.last_name,
  ])

  if (customerName !== "") {
    return customerName
  }

  const shippingName = joinNonEmpty([
    order.shipping_address?.company,
    order.shipping_address?.first_name,
    order.shipping_address?.last_name,
  ])

  return (
    [shippingName, order.customer?.email, order.email].find(
      (value) => value !== null && value !== undefined && value !== "",
    ) ?? order.id
  )
}

const formatOrderExpeditionAddress = (
  address?: OrderExpeditionAddress | null,
) => {
  if (!address) {
    return []
  }

  return [
    joinNonEmpty([address.company]),
    joinNonEmpty([address.first_name, address.last_name]),
    joinNonEmpty([address.address_1, address.address_2]),
    joinNonEmpty([address.postal_code, address.city]),
    joinNonEmpty([address.province]),
    joinNonEmpty([address.country_code?.toUpperCase()]),
    joinNonEmpty([address.phone]),
  ].filter(Boolean)
}

const normalizeDate = (value: OrderExpeditionDateValue | null | undefined) => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value ?? null
}

const isOrderExpeditionTransitionSourceStatus = (
  value: string,
): value is keyof typeof ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS =>
  value in ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS

const formatStatusForReason = (status: string) => status.replaceAll("_", " ")

const formatStatusSubject = (status: string) => {
  const formatted = formatStatusForReason(status)
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}

export const getOrderExpeditionTransitionBlockReason = (
  order: OrderExpeditionTransitionOrder,
  targetStatus: OrderExpeditionTargetStatus,
): OrderExpeditionOptional<string> => {
  const currentStatus = order.status

  if (
    currentStatus === null ||
    currentStatus === undefined ||
    currentStatus === ""
  ) {
    return "Order status is unknown"
  }

  if (currentStatus === targetStatus) {
    return `Order is already ${formatStatusForReason(targetStatus)}`
  }

  if (!isOrderExpeditionTransitionSourceStatus(currentStatus)) {
    return `Order status ${formatStatusForReason(currentStatus)} cannot be changed`
  }

  if (currentStatus === "archived") {
    return "Archived orders cannot be changed"
  }

  if (currentStatus === "canceled" && targetStatus !== "archived") {
    return "Canceled orders can only be archived"
  }

  if (currentStatus === "completed" && targetStatus === "canceled") {
    return "Completed orders cannot be canceled"
  }

  if (currentStatus === "completed" && targetStatus !== "archived") {
    return "Completed orders can only be archived"
  }

  if (
    targetStatus === "canceled" &&
    hasOrderExpeditionActiveFulfillment(order)
  ) {
    return "Orders with active fulfillments cannot be canceled"
  }

  const allowedTargetStatuses: readonly OrderExpeditionTargetStatus[] =
    ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS[currentStatus]

  return allowedTargetStatuses.includes(targetStatus)
    ? undefined
    : `${formatStatusSubject(currentStatus)} orders cannot be changed to ${formatStatusForReason(targetStatus)}`
}

const flattenSearchParts = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === "string") {
    return [value]
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenSearchParts)
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap(flattenSearchParts)
  }

  return []
}

const normalizeSearchValue = (value: unknown): string =>
  flattenSearchParts(value)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")

export const resolveOrderExpeditionCarrier = (
  order: Pick<OrderExpeditionRawOrder, "shipping_methods">,
): ResolvedOrderExpeditionCarrier => {
  for (const shippingMethod of order.shipping_methods ?? []) {
    const searchable = normalizeSearchValue([
      shippingMethod.name,
      shippingMethod.shipping_option_id,
      shippingMethod.data,
    ])
    const searchableTokens = new Set(
      searchable.split(CARRIER_TOKEN_SEPARATOR_REGEX).filter(Boolean),
    )

    for (const key of ["gls", "ppl", "packeta"] as const) {
      const matcher = CARRIER_MATCHERS[key]
      if (matcher.tokens.some((token) => searchableTokens.has(token))) {
        return {
          label: matcher.label,
          value: key,
          ...(shippingMethod.id === null ||
          shippingMethod.id === undefined ||
          shippingMethod.id === ""
            ? {}
            : { shipping_method_id: shippingMethod.id }),
          ...(shippingMethod.name === null ||
          shippingMethod.name === undefined ||
          shippingMethod.name === ""
            ? {}
            : { shipping_method_name: shippingMethod.name }),
          ...(shippingMethod.shipping_option_id === null ||
          shippingMethod.shipping_option_id === undefined ||
          shippingMethod.shipping_option_id === ""
            ? {}
            : { shipping_option_id: shippingMethod.shipping_option_id }),
        }
      }
    }
  }

  return { label: "Other", value: "other" }
}

export const orderMatchesExpeditionCarrier = (
  order: Pick<OrderExpeditionRawOrder, "shipping_methods">,
  carrier?: OrderExpeditionCarrierKey,
) => {
  if (!carrier) {
    return true
  }

  return resolveOrderExpeditionCarrier(order).value === carrier
}

const DEFAULT_ORDER_EXPEDITION_CUSTOMER_SIGNALS: OrderExpeditionCustomerSignals =
  {
    note: false,
    returning_customer: false,
    storn_orders: false,
  }

export const toOrderExpeditionDto = (
  order: OrderExpeditionRawOrder,
  signals: OrderExpeditionCustomerSignals = DEFAULT_ORDER_EXPEDITION_CUSTOMER_SIGNALS,
  noteOverride?: string | null,
): OrderExpeditionOrderDto => ({
  business_status: resolveOrderBusinessStatus(order),
  carrier: resolveOrderExpeditionCarrier(order),
  created_at: normalizeDate(order.created_at),
  customer: getOrderExpeditionCustomerName(order),
  delivery_address: formatOrderExpeditionAddress(order.shipping_address),
  email: order.email ?? order.customer?.email ?? null,
  has_active_fulfillment: hasOrderExpeditionActiveFulfillment(order),
  id: order.id,
  items: (order.items ?? []).map(toOrderExpeditionItemDto),
  manual_status: getManualOrderBusinessStatusId(order) ?? null,
  note: noteOverride ?? getOrderExpeditionNote(order.metadata),
  order_display_id: getOrderExpeditionDisplayId(order),
  packeta_barcode: getOrderExpeditionPacketaBarcode(order.fulfillments),
  payment_method: getOrderExpeditionPaymentMethod(order),
  signals,
  total: getOrderExpeditionTotal(order),
  ...(order.currency_code === undefined
    ? {}
    : { currency_code: order.currency_code }),
  ...(order.display_id === undefined ? {} : { display_id: order.display_id }),
  ...(order.fulfillment_status === undefined
    ? {}
    : { fulfillment_status: order.fulfillment_status }),
  ...(order.payment_status === undefined
    ? {}
    : { payment_status: order.payment_status }),
  ...(order.status === undefined ? {} : { status: order.status }),
})
