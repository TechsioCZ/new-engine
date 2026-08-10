import type { MedusaContainer } from "@medusajs/framework"
import type {
  BigNumberInput,
  IOrderModuleService,
  OrderPreviewDTO,
  Query,
} from "@medusajs/framework/types"
import type { BigNumber as MedusaBigNumber } from "@medusajs/framework/utils"
import {
  MedusaError,
  Modules,
  OrderChangeStatus,
} from "@medusajs/framework/utils"

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

interface GraphAmountValue {
  numeric?: unknown
  value?: unknown
}

type AmountValue =
  | BigNumberInput
  | GraphAmountValue
  | MedusaBigNumber
  | null
  | undefined

interface CommercialValuesOrderAdjustment {
  amount: AmountValue
  code?: string | null | undefined
  description?: string | null | undefined
  is_tax_inclusive?: boolean | null | undefined
  item_id?: string | null | undefined
  promotion_id?: string | null | undefined
  provider_id?: string | null | undefined
  shipping_method_id?: string | null | undefined
  total?: AmountValue
}

interface CommercialValuesOrderItem {
  adjustments?: (CommercialValuesOrderAdjustment | null)[] | null | undefined
  detail?:
    | {
        quantity?: AmountValue
        raw_quantity?: AmountValue
        raw_unit_price?: AmountValue
        unit_price?: AmountValue
      }
    | null
    | undefined
  discount_total?: AmountValue
  id: string
  is_discountable?: boolean | null | undefined
  is_tax_inclusive?: boolean | null | undefined
  original_subtotal?: AmountValue
  original_total?: AmountValue
  product_title?: string | null | undefined
  quantity?: AmountValue
  raw_original_subtotal?: AmountValue
  raw_original_total?: AmountValue
  raw_quantity?: AmountValue
  raw_subtotal?: AmountValue
  raw_total?: AmountValue
  raw_unit_price?: AmountValue
  subtitle?: string | null | undefined
  subtotal?: AmountValue
  tax_total?: AmountValue
  thumbnail?: string | null | undefined
  title?: string | null | undefined
  total?: AmountValue
  unit_price?: AmountValue
  variant_sku?: string | null | undefined
  variant_title?: string | null | undefined
}

interface CommercialValuesOrderShippingMethod {
  adjustments?: (CommercialValuesOrderAdjustment | null)[] | null | undefined
  amount?: AmountValue
  id: string
  name?: string | null | undefined
  original_subtotal?: AmountValue
  original_total?: AmountValue
  raw_amount?: AmountValue
  raw_original_subtotal?: AmountValue
  raw_original_total?: AmountValue
  raw_subtotal?: AmountValue
  raw_tax_total?: AmountValue
  raw_total?: AmountValue
  shipping_option_id?: string | null | undefined
  subtotal?: AmountValue
  tax_total?: AmountValue
  total?: AmountValue
}

export interface CommercialValuesOrder {
  currency_code?: string | null | undefined
  id: string
  items?: (CommercialValuesOrderItem | null)[] | null | undefined
  shipping_methods?:
    | (CommercialValuesOrderShippingMethod | null)[]
    | null
    | undefined
  status?: string | null | undefined
  total?: AmountValue
  version?: AmountValue
}

export interface ActiveOrderChange {
  change_type?: string | null | undefined
  id: string
  status: "pending" | "requested"
  version: number
}

const ORDER_FIELDS = [
  "id",
  "status",
  "version",
  "total",
  "currency_code",
  "items.id",
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
  "items.adjustments.total",
  "shipping_methods.id",
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
  "shipping_methods.adjustments.total",
]

const ACTIVE_ORDER_CHANGE_FIELDS = ["id", "status", "version", "change_type"]

const getCommercialValuesOrderItems = (order: CommercialValuesOrder) =>
  (order.items ?? []).filter((item) => item !== null)

const getCommercialValuesOrderShippingMethods = (
  order: CommercialValuesOrder,
) =>
  (order.shipping_methods ?? []).filter(
    (shippingMethod) => shippingMethod !== null,
  )

const getCommercialValuesAdjustments = (
  adjustments: (CommercialValuesOrderAdjustment | null)[] | null | undefined,
) => (adjustments ?? []).filter((adjustment) => adjustment !== null)

const NON_EDITABLE_STATUSES = new Set(["canceled", "archived", "draft"])
const ORDER_TOTAL_FIELD = "order total"
const SHIPPING_TAX_TOTAL_FIELD = "shipping tax total"

const normalizeAmountValue = (value: AmountValue) => {
  if (typeof value !== "object" || value === null) {
    return value
  }

  if ("value" in value) {
    return typeof value.value === "number" || typeof value.value === "string"
      ? value.value
      : null
  }

  if ("numeric" in value) {
    return typeof value.numeric === "number" ||
      typeof value.numeric === "string"
      ? value.numeric
      : null
  }

  return "toNumber" in value && typeof value.toNumber === "function"
    ? value.toNumber()
    : null
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
  adjustment: CommercialValuesOrderAdjustment,
): CommercialAdjustmentInput => ({
  amount: toFiniteAmount(adjustment.amount, "adjustment amount"),
  code: adjustment.code ?? undefined,
  description: adjustment.description ?? undefined,
  discount_intent: decodeCommercialDiscountIntent(adjustment.description),
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
  adjustment: CommercialValuesOrderAdjustment,
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
  adjustment: CommercialValuesOrderAdjustment,
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
    getCommercialValuesAdjustments(item.adjustments).map(mapAdjustment),
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
    existing_adjustments: getCommercialValuesAdjustments(item.adjustments).map(
      mapAdjustment,
    ),
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
    existing_adjustments: getCommercialValuesAdjustments(
      shippingMethod.adjustments,
    ).map((adjustment) => mapShippingAdjustment(adjustment, shippingMethod)),
    name: shippingMethod.name ?? undefined,
    shipping_method_id: shippingMethod.id,
  }
}

const getManualDiscountBaselineTotal = (order: CommercialValuesOrder) => {
  let manualItemDiscountTotal = 0
  let manualShippingDiscountTotal = 0

  for (const item of getCommercialValuesOrderItems(order)) {
    manualItemDiscountTotal += getManualAdjustmentTotal(
      getCommercialValuesAdjustments(item.adjustments).map(mapAdjustment),
    )
  }

  for (const shippingMethod of getCommercialValuesOrderShippingMethods(order)) {
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
): Promise<CommercialValuesOrder | undefined> => {
  const result = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })

  return result.data[0]
}

export const fetchActiveOrderChange = async (
  query: Query,
  orderId: string,
): Promise<ActiveOrderChange | undefined> => {
  const result = await query.graph({
    entity: "order_change",
    fields: ACTIVE_ORDER_CHANGE_FIELDS,
    filters: {
      order_id: orderId,
      status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
    },
    pagination: { take: 1 },
  })

  const [activeOrderChange] = result.data
  if (activeOrderChange === undefined) {
    return undefined
  }

  if (
    activeOrderChange.status !== "pending" &&
    activeOrderChange.status !== "requested"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order change query returned invalid order change data",
    )
  }

  return {
    change_type: activeOrderChange.change_type,
    id: activeOrderChange.id,
    status: activeOrderChange.status,
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
  preview: OrderPreviewDTO,
): CommercialValuesOrder => {
  const itemsById = new Map(
    getCommercialValuesOrderItems(order).map((item) => [item.id, item]),
  )
  const shippingMethodsById = new Map(
    getCommercialValuesOrderShippingMethods(order).map((shippingMethod) => [
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
  const orderModuleService = container.resolve<IOrderModuleService>(
    Modules.ORDER,
  )
  const preview = await orderModuleService.previewOrderChange(orderId)

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
    items: getCommercialValuesOrderItems(order).map((item) => {
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
    shipping_methods: getCommercialValuesOrderShippingMethods(order).map(
      (shippingMethod) => {
        const mapped = mapShippingMethod(shippingMethod)

        return {
          current_subtotal: mapped.current_subtotal,
          current_tax_total: mapped.current_tax_total ?? 0,
          existing_adjustments: mapped.existing_adjustments ?? [],
          name: mapped.name,
          shipping_method_id: mapped.shipping_method_id,
        }
      },
    ),
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
  const itemsById = new Map(
    getCommercialValuesOrderItems(order).map((item) => [item.id, item]),
  )
  const shippingMethodsById = new Map(
    getCommercialValuesOrderShippingMethods(order).map((shippingMethod) => [
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

  const items = getCommercialValuesOrderItems(order).map((item) => {
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
  const shippingMethods = getCommercialValuesOrderShippingMethods(order).map(
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
  items: getCommercialValuesOrderItems(order).map((item) => {
    const quantity = getItemQuantity(item)

    return {
      adjustments: getCommercialValuesAdjustments(item.adjustments).map(
        mapAdjustment,
      ),
      id: item.id,
      quantity,
      unit_price: getItemUnitPrice(item, quantity),
    }
  }),
  shipping_methods: getCommercialValuesOrderShippingMethods(order).map(
    (shippingMethod) => ({
      adjustments: getCommercialValuesAdjustments(
        shippingMethod.adjustments,
      ).map(mapAdjustment),
      id: shippingMethod.id,
    }),
  ),
})
