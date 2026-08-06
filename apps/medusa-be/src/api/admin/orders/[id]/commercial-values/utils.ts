import type { MedusaContainer } from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  MedusaError,
  Modules,
  OrderChangeStatus,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import type {
  CommercialAdjustmentInput,
  CommercialValuesCalculationInput,
  CommercialValuesEditBlocker,
  CommercialValuesItemInput,
  CommercialValuesShippingMethodInput,
  CommercialValuesSnapshot,
} from "../../../../../utils/order-commercial-values"
import {
  decodeCommercialDiscountIntent,
  isManualDiscountAdjustment,
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
  MANUAL_SHIPPING_DISCOUNT_CODE,
} from "../../../../../utils/order-commercial-values"
import type { ApplyCommercialValuesOrder } from "../../../../../workflows/order-commercial-values/apply-commercial-values"
import type { PostAdminOrderCommercialValuesPreviewSchemaType } from "./validators"

interface RawAmountValue {
  value?: number | string | null
}

interface BigNumberAmountValue {
  numeric_?: number | string | null
  toString?: () => string
}

type AmountValue =
  | number
  | string
  | RawAmountValue
  | BigNumberAmountValue
  | null
  | undefined

interface CommercialValuesOrderItem {
  id: string
  adjustments?: CommercialAdjustmentInput[] | null
  detail?: {
    quantity?: AmountValue
    raw_quantity?: RawAmountValue | null
    raw_unit_price?: RawAmountValue | null
    unit_price?: AmountValue
  } | null
  discount_total?: AmountValue
  original_subtotal?: AmountValue
  original_total?: AmountValue
  raw_original_subtotal?: RawAmountValue | null
  raw_original_total?: RawAmountValue | null
  raw_quantity?: RawAmountValue | null
  raw_subtotal?: RawAmountValue | null
  raw_total?: RawAmountValue | null
  raw_unit_price?: RawAmountValue | null
  subtotal?: AmountValue
  is_discountable?: boolean | null
  is_tax_inclusive?: boolean | null
  product_title?: string | null
  quantity?: AmountValue
  subtitle?: string | null
  tax_total?: AmountValue
  thumbnail?: string | null
  title?: string | null
  total?: AmountValue
  unit_price?: AmountValue
  variant_sku?: string | null
  variant_title?: string | null
}

interface CommercialValuesOrderShippingMethod {
  id: string
  adjustments?: CommercialAdjustmentInput[] | null
  amount?: AmountValue
  name?: string | null
  original_subtotal?: AmountValue
  original_total?: AmountValue
  raw_amount?: RawAmountValue | null
  raw_original_subtotal?: RawAmountValue | null
  raw_original_total?: RawAmountValue | null
  raw_subtotal?: RawAmountValue | null
  raw_tax_total?: RawAmountValue | null
  raw_total?: RawAmountValue | null
  shipping_option_id?: string | null
  subtotal?: AmountValue
  tax_total?: AmountValue
  total?: AmountValue
}

export interface CommercialValuesOrder {
  id: string
  currency_code?: string | null
  items?: CommercialValuesOrderItem[] | null
  shipping_methods?: CommercialValuesOrderShippingMethod[] | null | undefined
  status?: string | null
  total?: AmountValue
  version?: AmountValue
}

export interface ActiveOrderChange {
  change_type?: string | null
  id: string
  status: "pending" | "requested"
  version: number
}

type ActiveOrderChangeRecord = Omit<ActiveOrderChange, "version"> & {
  version?: number | string | null
}

const ORDER_FIELDS = [
  "id",
  "status",
  "version",
  "total",
  "currency_code",
  "items.id",
  "items.*",
  "items.detail.*",
  "items.title",
  "items.subtitle",
  "items.thumbnail",
  "items.product_title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.detail.quantity",
  "items.detail.unit_price",
  "items.detail.raw_quantity",
  "items.detail.raw_unit_price",
  "items.original_subtotal",
  "items.original_total",
  "items.subtotal",
  "items.total",
  "items.raw_quantity",
  "items.raw_unit_price",
  "items.raw_original_subtotal",
  "items.raw_original_total",
  "items.raw_subtotal",
  "items.raw_total",
  "items.discount_total",
  "items.tax_total",
  "items.is_discountable",
  "items.is_tax_inclusive",
  "items.adjustments.amount",
  "items.adjustments.code",
  "items.adjustments.description",
  "items.adjustments.is_tax_inclusive",
  "items.adjustments.item_id",
  "items.adjustments.promotion_id",
  "items.adjustments.provider_id",
  "items.adjustments.subtotal",
  "items.adjustments.total",
  "items.adjustments.raw_subtotal",
  "items.adjustments.raw_total",
  "shipping_methods.id",
  "shipping_methods.*",
  "shipping_methods.name",
  "shipping_methods.amount",
  "shipping_methods.original_subtotal",
  "shipping_methods.original_total",
  "shipping_methods.subtotal",
  "shipping_methods.tax_total",
  "shipping_methods.total",
  "shipping_methods.raw_amount",
  "shipping_methods.raw_original_subtotal",
  "shipping_methods.raw_original_total",
  "shipping_methods.raw_subtotal",
  "shipping_methods.raw_tax_total",
  "shipping_methods.raw_total",
  "shipping_methods.shipping_option_id",
  "shipping_methods.adjustments.amount",
  "shipping_methods.adjustments.code",
  "shipping_methods.adjustments.description",
  "shipping_methods.adjustments.is_tax_inclusive",
  "shipping_methods.adjustments.promotion_id",
  "shipping_methods.adjustments.provider_id",
  "shipping_methods.adjustments.shipping_method_id",
  "shipping_methods.adjustments.subtotal",
  "shipping_methods.adjustments.total",
  "shipping_methods.adjustments.raw_subtotal",
  "shipping_methods.adjustments.raw_total",
]

const ACTIVE_ORDER_CHANGE_FIELDS = ["id", "status", "version", "change_type"]

const NON_EDITABLE_STATUSES = new Set(["canceled", "archived", "draft"])
const ORDER_TOTAL_FIELD = "order total"
const SHIPPING_TAX_TOTAL_FIELD = "shipping tax total"

const normalizeAmountValue = (value: AmountValue) => {
  if (typeof value !== "object" || value === null) {
    return value
  }

  if ("value" in value) {
    return value.value
  }

  if ("numeric_" in value) {
    return value.numeric_
  }

  // BigNumberAmountValue may expose only toString(); the string still goes
  // through toFiniteAmount's finiteness validation.
  const stringify = value.toString
  if (
    typeof stringify === "function" &&
    stringify !== Object.prototype.toString
  ) {
    return stringify.call(value)
  }

  return null
}

const toFiniteAmount = (value: AmountValue, fieldName: string) => {
  const rawValue = normalizeAmountValue(value)
  const numberValue = typeof rawValue === "string" ? Number(rawValue) : rawValue

  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be a finite numeric value`,
    )
  }

  return numberValue
}

const toPositiveFiniteAmount = (value: AmountValue, fieldName: string) => {
  const numberValue = toFiniteAmount(value, fieldName)

  if (numberValue <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be greater than zero`,
    )
  }

  return numberValue
}

const toSafeInteger = (value: AmountValue, fieldName: string) => {
  const numberValue = toFiniteAmount(value, fieldName)

  if (!Number.isSafeInteger(numberValue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be an integer value`,
    )
  }

  return numberValue
}

const toOrderVersion = (version: AmountValue) =>
  toSafeInteger(version ?? 0, "order version")

const isCommercialValuesEntity = (value: unknown) => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    return false
  }

  const { adjustments } = value
  return (
    adjustments === null ||
    adjustments === undefined ||
    Array.isArray(adjustments)
  )
}

const isCommercialValuesOrderItem = (
  value: unknown,
): value is CommercialValuesOrderItem => isCommercialValuesEntity(value)

const isCommercialValuesOrderShippingMethod = (
  value: unknown,
): value is CommercialValuesOrderShippingMethod =>
  isCommercialValuesEntity(value)

const isCommercialValuesOrder = (
  value: unknown,
): value is CommercialValuesOrder => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    return false
  }

  const hasValidItems =
    value["items"] === undefined ||
    value["items"] === null ||
    (Array.isArray(value["items"]) &&
      value["items"].every(isCommercialValuesOrderItem))
  const hasValidShippingMethods =
    value["shipping_methods"] === undefined ||
    value["shipping_methods"] === null ||
    (Array.isArray(value["shipping_methods"]) &&
      value["shipping_methods"].every(isCommercialValuesOrderShippingMethod))

  return hasValidItems && hasValidShippingMethods
}

const isActiveOrderChangeRecord = (
  value: unknown,
): value is ActiveOrderChangeRecord =>
  isRecord(value) &&
  typeof value["id"] === "string" &&
  (value["status"] === OrderChangeStatus.PENDING ||
    value["status"] === OrderChangeStatus.REQUESTED)

const toQueryRows = (data: unknown, entityName: string): unknown[] => {
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${entityName} query returned invalid data`,
    )
  }

  return data
}

const requireCurrencyCode = (order: CommercialValuesOrder) => {
  if (
    order.currency_code === null ||
    order.currency_code === undefined ||
    order.currency_code === ""
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order currency_code is missing",
    )
  }

  return order.currency_code
}

export const isReusableCommercialValuesOrderEdit = (
  activeOrderChange?: ActiveOrderChange,
) =>
  activeOrderChange?.change_type === "edit" &&
  activeOrderChange.status === "pending"

const mapAdjustment = (
  adjustment: CommercialAdjustmentInput,
): CommercialAdjustmentInput => ({
  amount: toFiniteAmount(adjustment.amount, "adjustment amount"),
  code: adjustment.code ?? undefined,
  description: adjustment.description ?? undefined,
  discount_intent:
    adjustment.discount_intent ??
    decodeCommercialDiscountIntent(adjustment.description),
  is_preserved_manual_discount:
    adjustment.is_preserved_manual_discount ?? undefined,
  is_tax_inclusive: adjustment.is_tax_inclusive ?? undefined,
  item_id: adjustment.item_id ?? undefined,
  promotion_id: adjustment.promotion_id ?? undefined,
  provider_id: adjustment.provider_id ?? undefined,
  shipping_method_id: adjustment.shipping_method_id ?? undefined,
})

const getShippingMethodSubtotal = (
  shippingMethod: CommercialValuesOrderShippingMethod,
) => {
  const subtotal =
    shippingMethod.subtotal ??
    shippingMethod.original_subtotal ??
    shippingMethod.raw_subtotal ??
    shippingMethod.raw_original_subtotal

  if (subtotal !== null && subtotal !== undefined) {
    return toFiniteAmount(subtotal, "shipping subtotal")
  }

  const taxTotal =
    shippingMethod.tax_total ?? shippingMethod.raw_tax_total ?? undefined
  const total =
    shippingMethod.total ??
    shippingMethod.original_total ??
    shippingMethod.raw_total ??
    shippingMethod.raw_original_total

  if (total !== null && total !== undefined) {
    return Math.max(
      toFiniteAmount(total, "shipping total") -
        toFiniteAmount(taxTotal ?? 0, SHIPPING_TAX_TOTAL_FIELD),
      0,
    )
  }

  return toFiniteAmount(
    shippingMethod.amount ?? shippingMethod.raw_amount,
    "shipping amount",
  )
}

const toDisplayShippingAdjustmentAmount = (
  amount: number,
  adjustment: CommercialAdjustmentInput,
  shippingMethod: CommercialValuesOrderShippingMethod,
) => {
  const adjustmentTotal = adjustment.total

  if (adjustmentTotal !== null && adjustmentTotal !== undefined) {
    return toFiniteAmount(adjustmentTotal, "shipping adjustment total")
  }

  const taxTotal = shippingMethod.tax_total ?? shippingMethod.raw_tax_total
  const shippingSubtotal = getShippingMethodSubtotal(shippingMethod)
  const shippingTaxTotal =
    taxTotal === null || taxTotal === undefined
      ? 0
      : toFiniteAmount(taxTotal, SHIPPING_TAX_TOTAL_FIELD)
  const shippingTotal = shippingSubtotal + shippingTaxTotal

  if (shippingTaxTotal <= 0 || shippingSubtotal <= 0 || shippingTotal <= 0) {
    return amount
  }

  return (amount * shippingTotal) / shippingSubtotal
}

const mapShippingAdjustment = (
  adjustment: CommercialAdjustmentInput,
  shippingMethod: CommercialValuesOrderShippingMethod,
): CommercialAdjustmentInput => {
  const mapped = mapAdjustment(adjustment)

  return {
    ...mapped,
    amount: toDisplayShippingAdjustmentAmount(
      mapped.amount,
      adjustment,
      shippingMethod,
    ),
  }
}

const getItemQuantity = (item: CommercialValuesOrderItem) =>
  toPositiveFiniteAmount(
    item.quantity ??
      item.detail?.quantity ??
      item.raw_quantity ??
      item.detail?.raw_quantity,
    "item quantity",
  )

const getItemUnitPrice = (
  item: CommercialValuesOrderItem,
  quantity: number,
) => {
  const unitPrice =
    item.unit_price ??
    item.detail?.unit_price ??
    item.raw_unit_price ??
    item.detail?.raw_unit_price

  if (unitPrice !== null && unitPrice !== undefined) {
    return toFiniteAmount(unitPrice, "item unit price")
  }

  const subtotalCandidates: AmountValue[] = [
    item.subtotal,
    item.original_subtotal,
    item.original_total,
    item.total,
    item.raw_subtotal,
    item.raw_original_subtotal,
    item.raw_original_total,
    item.raw_total,
  ]
  const subtotal = subtotalCandidates.find(
    (candidate) => candidate !== null && candidate !== undefined,
  )

  if (subtotal !== null && subtotal !== undefined) {
    return toFiniteAmount(subtotal, "item subtotal") / quantity
  }

  return toFiniteAmount(item.unit_price, "item unit price")
}

const getManualAdjustmentTotal = (
  adjustments: CommercialAdjustmentInput[] | null | undefined,
) => {
  let total = 0

  for (const adjustment of adjustments ?? []) {
    if (isManualDiscountAdjustment(adjustment)) {
      total += adjustment.amount
    }
  }

  return total
}

const mapItem = (
  item: CommercialValuesOrderItem,
): CommercialValuesItemInput => {
  const quantity = getItemQuantity(item)
  const unitPrice = getItemUnitPrice(item, quantity)
  const manualAdjustmentTotal = getManualAdjustmentTotal(
    (item.adjustments ?? []).map(mapAdjustment),
  )
  const nonManualDiscountTotal = Math.max(
    toFiniteAmount(item.discount_total ?? 0, "item discount total") -
      manualAdjustmentTotal,
    0,
  )
  const currentSubtotal =
    item.subtotal === null || item.subtotal === undefined
      ? undefined
      : Math.max(
          toFiniteAmount(item.subtotal, "item subtotal") -
            nonManualDiscountTotal,
          0,
        )
  const reportedTaxTotal =
    item.tax_total === null || item.tax_total === undefined
      ? undefined
      : toFiniteAmount(item.tax_total, "item tax total")
  let currentTaxTotal = reportedTaxTotal

  if (
    currentSubtotal !== undefined &&
    item.is_tax_inclusive === true &&
    (reportedTaxTotal === undefined || reportedTaxTotal <= 0)
  ) {
    currentTaxTotal = Math.max(unitPrice * quantity - currentSubtotal, 0)
  }

  return {
    current_subtotal: currentSubtotal,
    current_tax_total: currentTaxTotal,
    existing_adjustments: (item.adjustments ?? []).map(mapAdjustment),
    is_discountable: item.is_discountable ?? true,
    is_tax_inclusive: item.is_tax_inclusive ?? false,
    item_id: item.id,
    original_unit_price: unitPrice,
    quantity,
    unit_price: unitPrice,
  }
}

const mapShippingMethod = (
  shippingMethod: CommercialValuesOrderShippingMethod,
): CommercialValuesShippingMethodInput => {
  const subtotal = getShippingMethodSubtotal(shippingMethod)
  const amount = shippingMethod.amount ?? shippingMethod.raw_amount
  const taxTotal =
    amount === null || amount === undefined
      ? (shippingMethod.tax_total ?? shippingMethod.raw_tax_total)
      : Math.max(toFiniteAmount(amount, "shipping amount") - subtotal, 0)

  return {
    current_subtotal: subtotal,
    current_tax_total:
      taxTotal === null || taxTotal === undefined
        ? undefined
        : toFiniteAmount(taxTotal, SHIPPING_TAX_TOTAL_FIELD),
    existing_adjustments: (shippingMethod.adjustments ?? []).map((adjustment) =>
      mapShippingAdjustment(adjustment, shippingMethod),
    ),
    name: shippingMethod.name ?? undefined,
    shipping_method_id: shippingMethod.id,
  }
}

const getManualDiscountBaselineTotal = (order: CommercialValuesOrder) => {
  let manualItemDiscountTotal = 0
  let manualShippingDiscountTotal = 0

  for (const item of order.items ?? []) {
    manualItemDiscountTotal += getManualAdjustmentTotal(
      (item.adjustments ?? []).map(mapAdjustment),
    )
  }

  for (const shippingMethod of order.shipping_methods ?? []) {
    const mapped = mapShippingMethod(shippingMethod)
    manualShippingDiscountTotal += getManualAdjustmentTotal(
      mapped.existing_adjustments,
    )
  }

  return (
    toFiniteAmount(order.total, ORDER_TOTAL_FIELD) +
    manualItemDiscountTotal +
    manualShippingDiscountTotal
  )
}

const hasRequestedItemDiscount = (
  requestedItem:
    | PostAdminOrderCommercialValuesPreviewSchemaType["items"][number]
    | undefined,
) => requestedItem !== undefined && "discount" in requestedItem

const hasRequestedShippingDiscount = (
  requestedShippingMethod:
    | NonNullable<
        PostAdminOrderCommercialValuesPreviewSchemaType["shipping_methods"]
      >[number]
    | undefined,
) =>
  requestedShippingMethod !== undefined && "discount" in requestedShippingMethod

const toCalculationAdjustment = (
  adjustment: CommercialAdjustmentInput,
  options: {
    itemDiscountRequested: boolean
    orderDiscountRequested: boolean
    shippingDiscountRequested: boolean
  },
): CommercialAdjustmentInput => {
  if (
    adjustment.code === MANUAL_ITEM_DISCOUNT_CODE &&
    !options.itemDiscountRequested
  ) {
    return {
      ...adjustment,
      code: null,
      is_preserved_manual_discount: true,
    }
  }

  if (
    adjustment.code === MANUAL_ORDER_DISCOUNT_CODE &&
    !options.orderDiscountRequested
  ) {
    return {
      ...adjustment,
      code: null,
      is_preserved_manual_discount: true,
    }
  }

  if (
    adjustment.code === MANUAL_SHIPPING_DISCOUNT_CODE &&
    !options.shippingDiscountRequested
  ) {
    return {
      ...adjustment,
      code: null,
      is_preserved_manual_discount: true,
    }
  }

  return adjustment
}

const toCalculationAdjustments = ({
  adjustments,
  itemDiscountRequested,
  orderDiscountRequested,
  shippingDiscountRequested = false,
}: {
  adjustments: CommercialAdjustmentInput[] | null | undefined
  itemDiscountRequested: boolean
  orderDiscountRequested: boolean
  shippingDiscountRequested?: boolean
}) =>
  (adjustments ?? []).map((adjustment) =>
    toCalculationAdjustment(adjustment, {
      itemDiscountRequested,
      orderDiscountRequested,
      shippingDiscountRequested,
    }),
  )

export const fetchCommercialValuesOrder = async (
  query: Query,
  orderId: string,
) => {
  const result = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })
  const rows = toQueryRows(result.data, "order")
  const [order] = rows

  if (order !== undefined && !isCommercialValuesOrder(order)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order query returned invalid order data",
    )
  }

  return order
}

export const fetchActiveOrderChange = async (query: Query, orderId: string) => {
  const result = await query.graph({
    entity: "order_change",
    fields: ACTIVE_ORDER_CHANGE_FIELDS,
    filters: {
      order_id: orderId,
      status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
    },
    pagination: { take: 1 },
  })
  const rows = toQueryRows(result.data, "order_change")
  const [activeOrderChange] = rows

  if (
    activeOrderChange !== undefined &&
    !isActiveOrderChangeRecord(activeOrderChange)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order change query returned invalid order change data",
    )
  }

  return activeOrderChange === undefined
    ? undefined
    : {
        ...activeOrderChange,
        change_type: activeOrderChange.change_type ?? null,
        version: toSafeInteger(
          activeOrderChange.version ?? 0,
          "order change version",
        ),
      }
}

export const getCommercialValuesEditBlockers = (
  order: CommercialValuesOrder,
  activeOrderChange?: ActiveOrderChange,
) => {
  const blockers: CommercialValuesEditBlocker[] = []

  if (
    order.status !== null &&
    order.status !== undefined &&
    order.status !== "" &&
    NON_EDITABLE_STATUSES.has(order.status)
  ) {
    blockers.push({
      code: "order_status_not_editable",
      status: order.status,
    })
  }

  if (
    activeOrderChange &&
    !isReusableCommercialValuesOrderEdit(activeOrderChange)
  ) {
    blockers.push({
      code: "active_order_change_exists",
      order_change_id: activeOrderChange.id,
    })
  }

  return blockers
}

export const assertCommercialValuesOrderFound: (
  order: CommercialValuesOrder | undefined,
  orderId: string,
) => asserts order is CommercialValuesOrder = (order, orderId) => {
  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${orderId} was not found`,
    )
  }
}

export const assertCommercialValuesEditable = (
  order: CommercialValuesOrder,
  activeOrderChange?: ActiveOrderChange,
) => {
  if (
    order.status !== null &&
    order.status !== undefined &&
    order.status !== "" &&
    NON_EDITABLE_STATUSES.has(order.status)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Order status ${order.status} is not editable`,
    )
  }

  if (
    activeOrderChange &&
    !isReusableCommercialValuesOrderEdit(activeOrderChange)
  ) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Order already has active order change ${activeOrderChange.id}`,
    )
  }
}

export const assertExpectedOrderVersion = (
  order: CommercialValuesOrder,
  expectedOrderVersion: number,
) => {
  const orderVersion = toOrderVersion(order.version)

  if (orderVersion !== expectedOrderVersion) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Expected order version ${expectedOrderVersion}, got ${orderVersion}`,
    )
  }
}

export const requireCommercialValuesOrderId = (orderId: string | undefined) => {
  if (orderId === undefined || orderId === "") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is missing")
  }

  return orderId
}

const mergePreviewItem = (
  item: CommercialValuesOrderItem,
  originalItem: CommercialValuesOrderItem | undefined,
): CommercialValuesOrderItem => {
  if (originalItem === undefined) {
    return item
  }

  const mergedItem: CommercialValuesOrderItem = {
    ...originalItem,
    ...item,
    detail: { ...originalItem.detail, ...item.detail },
  }
  const adjustments = item.adjustments ?? originalItem.adjustments
  const quantity =
    item.quantity ?? item.detail?.quantity ?? originalItem.quantity
  const rawQuantity =
    item.raw_quantity ?? item.detail?.raw_quantity ?? originalItem.raw_quantity
  const rawUnitPrice =
    item.raw_unit_price ??
    item.detail?.raw_unit_price ??
    originalItem.raw_unit_price
  const unitPrice =
    item.unit_price ?? item.detail?.unit_price ?? originalItem.unit_price

  if (adjustments !== undefined) {
    mergedItem.adjustments = adjustments
  }
  if (quantity !== undefined) {
    mergedItem.quantity = quantity
  }
  if (rawQuantity !== undefined) {
    mergedItem.raw_quantity = rawQuantity
  }
  if (rawUnitPrice !== undefined) {
    mergedItem.raw_unit_price = rawUnitPrice
  }
  if (unitPrice !== undefined) {
    mergedItem.unit_price = unitPrice
  }

  return mergedItem
}

const mergePreviewShippingMethod = (
  shippingMethod: CommercialValuesOrderShippingMethod,
  originalShippingMethod: CommercialValuesOrderShippingMethod | undefined,
): CommercialValuesOrderShippingMethod => {
  if (originalShippingMethod === undefined) {
    return shippingMethod
  }

  const mergedShippingMethod = {
    ...originalShippingMethod,
    ...shippingMethod,
  }
  const adjustments =
    shippingMethod.adjustments ?? originalShippingMethod.adjustments

  if (adjustments !== undefined) {
    mergedShippingMethod.adjustments = adjustments
  }

  return mergedShippingMethod
}

const mergeOrderChangePreview = (
  order: CommercialValuesOrder,
  preview: CommercialValuesOrder,
): CommercialValuesOrder => {
  const itemsById = new Map((order.items ?? []).map((item) => [item.id, item]))
  const shippingMethodsById = new Map(
    (order.shipping_methods ?? []).map((shippingMethod) => [
      shippingMethod.id,
      shippingMethod,
    ]),
  )

  return {
    ...order,
    ...preview,
    currency_code: preview.currency_code ?? order.currency_code ?? null,
    items:
      preview.items?.map((item) =>
        mergePreviewItem(item, itemsById.get(item.id)),
      ) ??
      order.items ??
      null,
    shipping_methods:
      preview.shipping_methods?.map((shippingMethod) =>
        mergePreviewShippingMethod(
          shippingMethod,
          shippingMethodsById.get(shippingMethod.id),
        ),
      ) ??
      order.shipping_methods ??
      null,
    status: preview.status ?? order.status ?? null,
    total: preview.total ?? order.total ?? null,
    version: preview.version ?? order.version ?? null,
  }
}

const fetchOrderChangePreview = async (
  container: MedusaContainer,
  orderId: string,
  order: CommercialValuesOrder,
) => {
  const orderModuleService = container.resolve(Modules.ORDER) as {
    previewOrderChange: (orderId: string) => Promise<unknown>
  }
  const preview = await orderModuleService.previewOrderChange(orderId)

  if (!isCommercialValuesOrder(preview)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order preview returned invalid order data",
    )
  }

  return mergeOrderChangePreview(order, preview)
}

export const fetchEditableCommercialValuesOrder = async (
  container: MedusaContainer,
  query: Query,
  orderId: string,
  expectedOrderVersion: number,
) => {
  const order = await fetchCommercialValuesOrder(query, orderId)

  assertCommercialValuesOrderFound(order, orderId)

  const activeOrderChange = await fetchActiveOrderChange(query, orderId)

  assertCommercialValuesEditable(order, activeOrderChange)
  assertExpectedOrderVersion(order, expectedOrderVersion)

  return isReusableCommercialValuesOrderEdit(activeOrderChange)
    ? await fetchOrderChangePreview(container, orderId, order)
    : order
}

export const fetchCommercialValuesSnapshotOrder = async (
  container: MedusaContainer,
  query: Query,
  orderId: string,
) => {
  const order = await fetchCommercialValuesOrder(query, orderId)

  assertCommercialValuesOrderFound(order, orderId)

  const activeOrderChange = await fetchActiveOrderChange(query, orderId)
  const snapshotOrder = isReusableCommercialValuesOrderEdit(activeOrderChange)
    ? await fetchOrderChangePreview(container, orderId, order)
    : order

  return {
    activeOrderChange,
    order: snapshotOrder,
  }
}

export const toCommercialValuesSnapshot = (
  order: CommercialValuesOrder,
  activeOrderChange?: ActiveOrderChange,
): CommercialValuesSnapshot => {
  const blockers = getCommercialValuesEditBlockers(order, activeOrderChange)
  const currencyCode = requireCurrencyCode(order)

  return {
    ...(activeOrderChange ? { active_order_change: activeOrderChange } : {}),
    currency_code: currencyCode,
    edit_blockers: blockers,
    editable: blockers.length === 0,
    expected_order_version: toOrderVersion(order.version),
    items: (order.items ?? []).map((item) => {
      const mapped = mapItem(item)

      return {
        existing_adjustments: mapped.existing_adjustments ?? [],
        is_discountable: mapped.is_discountable ?? true,
        item_id: mapped.item_id,
        original_unit_price: mapped.original_unit_price,
        product_title: item.product_title ?? undefined,
        quantity: mapped.quantity,
        subtitle: item.subtitle ?? undefined,
        thumbnail: item.thumbnail ?? undefined,
        title: item.title ?? undefined,
        unit_price: mapped.unit_price,
        variant_sku: item.variant_sku ?? undefined,
        variant_title: item.variant_title ?? undefined,
      }
    }),
    order_id: order.id,
    shipping_methods: (order.shipping_methods ?? []).map((shippingMethod) => {
      const mapped = mapShippingMethod(shippingMethod)

      return {
        current_subtotal: mapped.current_subtotal,
        current_tax_total: mapped.current_tax_total ?? 0,
        existing_adjustments: mapped.existing_adjustments ?? [],
        name: mapped.name,
        shipping_method_id: mapped.shipping_method_id,
      }
    }),
    totals: {
      current_total: toFiniteAmount(order.total, ORDER_TOTAL_FIELD),
      original_total: getManualDiscountBaselineTotal(order),
    },
  }
}

export const toCommercialValuesCalculationInput = (
  order: CommercialValuesOrder,
  body: PostAdminOrderCommercialValuesPreviewSchemaType,
): CommercialValuesCalculationInput => {
  const currencyCode = requireCurrencyCode(order)
  const itemsById = new Map((order.items ?? []).map((item) => [item.id, item]))
  const shippingMethodsById = new Map(
    (order.shipping_methods ?? []).map((shippingMethod) => [
      shippingMethod.id,
      shippingMethod,
    ]),
  )
  const requestedItemsById = new Map(
    body.items.map((item) => [item.item_id, item]),
  )
  const requestedShippingMethods = body.shipping_methods ?? []
  const requestedShippingMethodsById = new Map(
    requestedShippingMethods.map((shippingMethod) => [
      shippingMethod.shipping_method_id,
      shippingMethod,
    ]),
  )

  if (requestedItemsById.size !== body.items.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request contains duplicate item ids",
    )
  }

  if (requestedShippingMethodsById.size !== requestedShippingMethods.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request contains duplicate shipping method ids",
    )
  }

  for (const requestedItem of body.items) {
    if (!itemsById.has(requestedItem.item_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order item ${requestedItem.item_id} was not found`,
      )
    }
  }

  for (const requestedShippingMethod of requestedShippingMethods) {
    if (!shippingMethodsById.has(requestedShippingMethod.shipping_method_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Shipping method ${requestedShippingMethod.shipping_method_id} was not found`,
      )
    }
  }

  const items = (order.items ?? []).map((item) => {
    const mapped = mapItem(item)
    const requested = requestedItemsById.get(item.id)
    const itemDiscountRequested = hasRequestedItemDiscount(requested)
    const orderDiscountRequested = body.order_discount !== undefined

    return {
      ...mapped,
      discount: requested?.discount ?? undefined,
      existing_adjustments: toCalculationAdjustments({
        adjustments: mapped.existing_adjustments,
        itemDiscountRequested,
        orderDiscountRequested,
      }),
      unit_price: requested?.unit_price ?? mapped.unit_price,
    }
  })
  const shippingMethods = (order.shipping_methods ?? []).map(
    (shippingMethod) => {
      const mapped = mapShippingMethod(shippingMethod)
      const requested = requestedShippingMethodsById.get(shippingMethod.id)
      const shippingDiscountRequested = hasRequestedShippingDiscount(requested)
      const orderDiscountRequested = body.order_discount !== undefined

      return {
        ...mapped,
        discount: requested?.discount ?? undefined,
        existing_adjustments: toCalculationAdjustments({
          adjustments: mapped.existing_adjustments,
          itemDiscountRequested: false,
          orderDiscountRequested,
          shippingDiscountRequested,
        }),
      }
    },
  )

  return {
    currency_code: currencyCode,
    current_total: toFiniteAmount(order.total, ORDER_TOTAL_FIELD),
    expected_order_version: body.expected_order_version,
    items,
    order_discount: body.order_discount ?? undefined,
    order_id: order.id,
    original_total: getManualDiscountBaselineTotal(order),
    shipping_methods: shippingMethods,
  }
}

export const toApplyCommercialValuesOrder = (
  order: CommercialValuesOrder,
): ApplyCommercialValuesOrder => ({
  id: order.id,
  items: (order.items ?? []).map((item) => {
    const quantity = getItemQuantity(item)

    return {
      adjustments: (item.adjustments ?? []).map(mapAdjustment),
      id: item.id,
      quantity,
      unit_price: getItemUnitPrice(item, quantity),
    }
  }),
  shipping_methods: (order.shipping_methods ?? []).map((shippingMethod) => ({
    adjustments: (shippingMethod.adjustments ?? []).map(mapAdjustment),
    id: shippingMethod.id,
  })),
})
