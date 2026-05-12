import type { MedusaContainer } from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
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
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
  MANUAL_SHIPPING_DISCOUNT_CODE,
} from "../../../../../utils/order-commercial-values"
import type { ApplyCommercialValuesOrder } from "../../../../../workflows/order-commercial-values/apply-commercial-values"
import type { PostAdminOrderCommercialValuesPreviewSchemaType } from "./validators"

type RawAmountValue = {
  value?: number | string | null
}

type BigNumberAmountValue = {
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

type CommercialValuesOrderItem = {
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

type CommercialValuesOrderShippingMethod = {
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

export type CommercialValuesOrder = {
  id: string
  currency_code?: string | null
  items?: CommercialValuesOrderItem[] | null
  shipping_methods?: CommercialValuesOrderShippingMethod[] | null
  status?: string | null
  total?: AmountValue
  version?: AmountValue
}

export type ActiveOrderChange = {
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
  "items.adjustments.amount",
  "items.adjustments.code",
  "items.adjustments.description",
  "items.adjustments.is_tax_inclusive",
  "items.adjustments.item_id",
  "items.adjustments.promotion_id",
  "items.adjustments.provider_id",
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
]

const ACTIVE_ORDER_CHANGE_FIELDS = ["id", "status", "version", "change_type"]

const NON_EDITABLE_STATUSES = new Set(["canceled", "archived", "draft"])

function toFiniteAmount(value: AmountValue, fieldName: string) {
  const rawValue = normalizeAmountValue(value)
  const numberValue = typeof rawValue === "string" ? Number(rawValue) : rawValue

  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be a finite numeric value`
    )
  }

  return numberValue
}

function normalizeAmountValue(
  value: AmountValue
): number | string | null | undefined {
  if (typeof value !== "object" || value === null) {
    return value
  }

  if ("value" in value) {
    return value.value
  }

  if ("numeric_" in value) {
    return value.numeric_
  }

  return value.toString?.()
}

function toPositiveFiniteAmount(value: AmountValue, fieldName: string) {
  const numberValue = toFiniteAmount(value, fieldName)

  if (numberValue <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be greater than zero`
    )
  }

  return numberValue
}

function toSafeInteger(value: AmountValue, fieldName: string) {
  const numberValue = toFiniteAmount(value, fieldName)

  if (!Number.isSafeInteger(numberValue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be an integer value`
    )
  }

  return numberValue
}

function toOrderVersion(version: AmountValue) {
  return toSafeInteger(version ?? 0, "order version")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function isCommercialValuesOrderItem(
  value: unknown
): value is CommercialValuesOrderItem {
  if (!isRecord(value) || typeof value.id !== "string") {
    return false
  }

  return (
    value.adjustments === undefined ||
    value.adjustments === null ||
    Array.isArray(value.adjustments)
  )
}

function isCommercialValuesOrderShippingMethod(
  value: unknown
): value is CommercialValuesOrderShippingMethod {
  if (!isRecord(value) || typeof value.id !== "string") {
    return false
  }

  return (
    value.adjustments === undefined ||
    value.adjustments === null ||
    Array.isArray(value.adjustments)
  )
}

function isCommercialValuesOrder(
  value: unknown
): value is CommercialValuesOrder {
  if (!isRecord(value) || typeof value.id !== "string") {
    return false
  }

  const hasValidItems =
    value.items === undefined ||
    value.items === null ||
    (Array.isArray(value.items) &&
      value.items.every(isCommercialValuesOrderItem))
  const hasValidShippingMethods =
    value.shipping_methods === undefined ||
    value.shipping_methods === null ||
    (Array.isArray(value.shipping_methods) &&
      value.shipping_methods.every(isCommercialValuesOrderShippingMethod))

  return hasValidItems && hasValidShippingMethods
}

function isActiveOrderChangeRecord(
  value: unknown
): value is ActiveOrderChangeRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.status === OrderChangeStatus.PENDING ||
      value.status === OrderChangeStatus.REQUESTED)
  )
}

function toQueryRows(data: unknown, entityName: string) {
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${entityName} query returned invalid data`
    )
  }

  return data
}

function requireCurrencyCode(order: CommercialValuesOrder) {
  if (!order.currency_code) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order currency_code is missing"
    )
  }

  return order.currency_code
}

export function isReusableCommercialValuesOrderEdit(
  activeOrderChange?: ActiveOrderChange
) {
  return (
    activeOrderChange?.change_type === "edit" &&
    activeOrderChange.status === OrderChangeStatus.PENDING
  )
}

function mapAdjustment(
  adjustment: CommercialAdjustmentInput
): CommercialAdjustmentInput {
  return {
    amount: toFiniteAmount(adjustment.amount, "adjustment amount"),
    code: adjustment.code ?? undefined,
    description: adjustment.description ?? undefined,
    is_tax_inclusive: adjustment.is_tax_inclusive ?? undefined,
    item_id: adjustment.item_id ?? undefined,
    promotion_id: adjustment.promotion_id ?? undefined,
    provider_id: adjustment.provider_id ?? undefined,
    shipping_method_id: adjustment.shipping_method_id ?? undefined,
  }
}

function getItemQuantity(item: CommercialValuesOrderItem) {
  return toPositiveFiniteAmount(
    item.quantity ??
      item.detail?.quantity ??
      item.raw_quantity ??
      item.detail?.raw_quantity,
    "item quantity"
  )
}

function getItemUnitPrice(item: CommercialValuesOrderItem, quantity: number) {
  const unitPrice =
    item.unit_price ??
    item.detail?.unit_price ??
    item.raw_unit_price ??
    item.detail?.raw_unit_price

  if (unitPrice !== null && unitPrice !== undefined) {
    return toFiniteAmount(unitPrice, "item unit price")
  }

  const subtotal =
    item.subtotal ??
    item.original_subtotal ??
    item.original_total ??
    item.total ??
    item.raw_subtotal ??
    item.raw_original_subtotal ??
    item.raw_original_total ??
    item.raw_total

  if (subtotal !== null && subtotal !== undefined) {
    return toFiniteAmount(subtotal, "item subtotal") / quantity
  }

  return toFiniteAmount(item.unit_price, "item unit price")
}

function mapItem(item: CommercialValuesOrderItem): CommercialValuesItemInput {
  const quantity = getItemQuantity(item)
  const unitPrice = getItemUnitPrice(item, quantity)
  const currentSubtotal =
    item.subtotal === null || item.subtotal === undefined
      ? undefined
      : Math.max(
          toFiniteAmount(item.subtotal, "item subtotal") -
            toFiniteAmount(item.discount_total ?? 0, "item discount total"),
          0
        )

  return {
    current_subtotal: currentSubtotal,
    current_tax_total:
      item.tax_total === null || item.tax_total === undefined
        ? undefined
        : toFiniteAmount(item.tax_total, "item tax total"),
    existing_adjustments: (item.adjustments ?? []).map(mapAdjustment),
    is_discountable: item.is_discountable ?? true,
    item_id: item.id,
    original_unit_price: unitPrice,
    quantity,
    unit_price: unitPrice,
  }
}

function getShippingMethodSubtotal(
  shippingMethod: CommercialValuesOrderShippingMethod
) {
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
        toFiniteAmount(taxTotal ?? 0, "shipping tax total"),
      0
    )
  }

  return toFiniteAmount(
    shippingMethod.amount ?? shippingMethod.raw_amount,
    "shipping amount"
  )
}

function mapShippingMethod(
  shippingMethod: CommercialValuesOrderShippingMethod
): CommercialValuesShippingMethodInput {
  const taxTotal =
    shippingMethod.tax_total === null || shippingMethod.tax_total === undefined
      ? shippingMethod.raw_tax_total
      : shippingMethod.tax_total

  return {
    current_subtotal: getShippingMethodSubtotal(shippingMethod),
    current_tax_total:
      taxTotal === null || taxTotal === undefined
        ? undefined
        : toFiniteAmount(taxTotal, "shipping tax total"),
    existing_adjustments: (shippingMethod.adjustments ?? []).map(mapAdjustment),
    name: shippingMethod.name ?? undefined,
    shipping_method_id: shippingMethod.id,
  }
}

function hasRequestedItemDiscount(
  requestedItem:
    | PostAdminOrderCommercialValuesPreviewSchemaType["items"][number]
    | undefined
) {
  return requestedItem ? "discount" in requestedItem : false
}

function hasRequestedShippingDiscount(
  requestedShippingMethod:
    | NonNullable<
        PostAdminOrderCommercialValuesPreviewSchemaType["shipping_methods"]
      >[number]
    | undefined
) {
  return requestedShippingMethod ? "discount" in requestedShippingMethod : false
}

function toCalculationAdjustment(
  adjustment: CommercialAdjustmentInput,
  options: {
    itemDiscountRequested: boolean
    orderDiscountRequested: boolean
    shippingDiscountRequested: boolean
  }
): CommercialAdjustmentInput {
  if (
    adjustment.code === MANUAL_ITEM_DISCOUNT_CODE &&
    !options.itemDiscountRequested
  ) {
    return { ...adjustment, code: undefined }
  }

  if (
    adjustment.code === MANUAL_ORDER_DISCOUNT_CODE &&
    !options.orderDiscountRequested
  ) {
    return { ...adjustment, code: undefined }
  }

  if (
    adjustment.code === MANUAL_SHIPPING_DISCOUNT_CODE &&
    !options.shippingDiscountRequested
  ) {
    return { ...adjustment, code: undefined }
  }

  return adjustment
}

function toCalculationAdjustments({
  adjustments,
  itemDiscountRequested,
  orderDiscountRequested,
  shippingDiscountRequested = false,
}: {
  adjustments: CommercialAdjustmentInput[] | null | undefined
  itemDiscountRequested: boolean
  orderDiscountRequested: boolean
  shippingDiscountRequested?: boolean
}) {
  return (adjustments ?? []).map((adjustment) =>
    toCalculationAdjustment(adjustment, {
      itemDiscountRequested,
      orderDiscountRequested,
      shippingDiscountRequested,
    })
  )
}

export async function fetchCommercialValuesOrder(
  query: Query,
  orderId: string
) {
  const result = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })
  const rows = toQueryRows(result.data, "order")
  const order = rows[0]

  if (order === undefined) {
    return
  }

  if (!isCommercialValuesOrder(order)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order query returned invalid order data"
    )
  }

  return order
}

export async function fetchActiveOrderChange(query: Query, orderId: string) {
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
  const activeOrderChange = rows[0]

  if (activeOrderChange === undefined) {
    return
  }

  if (!isActiveOrderChangeRecord(activeOrderChange)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order change query returned invalid order change data"
    )
  }

  return {
    ...activeOrderChange,
    change_type: activeOrderChange.change_type ?? undefined,
    version: toSafeInteger(
      activeOrderChange.version ?? 0,
      "order change version"
    ),
  }
}

export function getCommercialValuesEditBlockers(
  order: CommercialValuesOrder,
  activeOrderChange?: ActiveOrderChange
) {
  const blockers: CommercialValuesEditBlocker[] = []

  if (order.status && NON_EDITABLE_STATUSES.has(order.status)) {
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

export function assertCommercialValuesOrderFound(
  order: CommercialValuesOrder | undefined,
  orderId: string
): asserts order is CommercialValuesOrder {
  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${orderId} was not found`
    )
  }
}

export function assertCommercialValuesEditable(
  order: CommercialValuesOrder,
  activeOrderChange?: ActiveOrderChange
) {
  if (order.status && NON_EDITABLE_STATUSES.has(order.status)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Order status ${order.status} is not editable`
    )
  }

  if (
    activeOrderChange &&
    !isReusableCommercialValuesOrderEdit(activeOrderChange)
  ) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Order already has active order change ${activeOrderChange.id}`
    )
  }
}

export function assertExpectedOrderVersion(
  order: CommercialValuesOrder,
  expectedOrderVersion: number
) {
  const orderVersion = toOrderVersion(order.version)

  if (orderVersion !== expectedOrderVersion) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Expected order version ${expectedOrderVersion}, got ${orderVersion}`
    )
  }
}

export function requireCommercialValuesOrderId(orderId: string | undefined) {
  if (!orderId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is missing")
  }

  return orderId
}

function mergeOrderChangePreview(
  order: CommercialValuesOrder,
  preview: CommercialValuesOrder
): CommercialValuesOrder {
  const itemsById = new Map((order.items ?? []).map((item) => [item.id, item]))
  const shippingMethodsById = new Map(
    (order.shipping_methods ?? []).map((shippingMethod) => [
      shippingMethod.id,
      shippingMethod,
    ])
  )

  return {
    ...order,
    ...preview,
    currency_code: preview.currency_code ?? order.currency_code,
    items:
      preview.items?.map((item) => {
        const originalItem = itemsById.get(item.id)

        if (!originalItem) {
          return item
        }

        return {
          ...originalItem,
          ...item,
          adjustments: item.adjustments ?? originalItem.adjustments,
          detail: {
            ...originalItem.detail,
            ...item.detail,
          },
          quantity:
            item.quantity ?? item.detail?.quantity ?? originalItem.quantity,
          raw_quantity:
            item.raw_quantity ??
            item.detail?.raw_quantity ??
            originalItem.raw_quantity,
          raw_unit_price:
            item.raw_unit_price ??
            item.detail?.raw_unit_price ??
            originalItem.raw_unit_price,
          unit_price:
            item.unit_price ??
            item.detail?.unit_price ??
            originalItem.unit_price,
        }
      }) ?? order.items,
    shipping_methods:
      preview.shipping_methods?.map((shippingMethod) => {
        const originalShippingMethod = shippingMethodsById.get(
          shippingMethod.id
        )

        if (!originalShippingMethod) {
          return shippingMethod
        }

        return {
          ...originalShippingMethod,
          ...shippingMethod,
          adjustments:
            shippingMethod.adjustments ?? originalShippingMethod.adjustments,
        }
      }) ?? order.shipping_methods,
    status: preview.status ?? order.status,
    total: preview.total ?? order.total,
    version: preview.version ?? order.version,
  }
}

async function fetchOrderChangePreview(
  container: MedusaContainer,
  orderId: string,
  order: CommercialValuesOrder
) {
  const orderModuleService = container.resolve(Modules.ORDER) as {
    previewOrderChange: (orderId: string) => Promise<unknown>
  }
  const preview = await orderModuleService.previewOrderChange(orderId)

  if (!isCommercialValuesOrder(preview)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order preview returned invalid order data"
    )
  }

  return mergeOrderChangePreview(order, preview)
}

export async function fetchEditableCommercialValuesOrder(
  container: MedusaContainer,
  query: Query,
  orderId: string,
  expectedOrderVersion: number
) {
  const order = await fetchCommercialValuesOrder(query, orderId)

  assertCommercialValuesOrderFound(order, orderId)

  const activeOrderChange = await fetchActiveOrderChange(query, orderId)

  assertCommercialValuesEditable(order, activeOrderChange)
  assertExpectedOrderVersion(order, expectedOrderVersion)

  return isReusableCommercialValuesOrderEdit(activeOrderChange)
    ? fetchOrderChangePreview(container, orderId, order)
    : order
}

export async function fetchCommercialValuesSnapshotOrder(
  container: MedusaContainer,
  query: Query,
  orderId: string
) {
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

export function toCommercialValuesSnapshot(
  order: CommercialValuesOrder,
  activeOrderChange?: ActiveOrderChange
): CommercialValuesSnapshot {
  const blockers = getCommercialValuesEditBlockers(order, activeOrderChange)
  const currencyCode = requireCurrencyCode(order)

  return {
    active_order_change: activeOrderChange,
    currency_code: currencyCode,
    editable: blockers.length === 0,
    edit_blockers: blockers,
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
      current_total: toFiniteAmount(order.total, "order total"),
      original_total: toFiniteAmount(order.total, "order total"),
    },
  }
}

export function toCommercialValuesCalculationInput(
  order: CommercialValuesOrder,
  body: PostAdminOrderCommercialValuesPreviewSchemaType
): CommercialValuesCalculationInput {
  const currencyCode = requireCurrencyCode(order)
  const itemsById = new Map((order.items ?? []).map((item) => [item.id, item]))
  const shippingMethodsById = new Map(
    (order.shipping_methods ?? []).map((shippingMethod) => [
      shippingMethod.id,
      shippingMethod,
    ])
  )
  const requestedItemsById = new Map(
    body.items.map((item) => [item.item_id, item])
  )
  const requestedShippingMethods = body.shipping_methods ?? []
  const requestedShippingMethodsById = new Map(
    requestedShippingMethods.map((shippingMethod) => [
      shippingMethod.shipping_method_id,
      shippingMethod,
    ])
  )

  if (requestedItemsById.size !== body.items.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request contains duplicate item ids"
    )
  }

  if (requestedShippingMethodsById.size !== requestedShippingMethods.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request contains duplicate shipping method ids"
    )
  }

  for (const requestedItem of body.items) {
    if (!itemsById.has(requestedItem.item_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order item ${requestedItem.item_id} was not found`
      )
    }
  }

  for (const requestedShippingMethod of requestedShippingMethods) {
    if (!shippingMethodsById.has(requestedShippingMethod.shipping_method_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Shipping method ${requestedShippingMethod.shipping_method_id} was not found`
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
      existing_adjustments: toCalculationAdjustments({
        adjustments: mapped.existing_adjustments,
        itemDiscountRequested,
        orderDiscountRequested,
      }),
      discount: requested?.discount ?? undefined,
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
        existing_adjustments: toCalculationAdjustments({
          adjustments: mapped.existing_adjustments,
          itemDiscountRequested: false,
          orderDiscountRequested,
          shippingDiscountRequested,
        }),
        discount: requested?.discount ?? undefined,
      }
    }
  )

  return {
    currency_code: currencyCode,
    expected_order_version: body.expected_order_version,
    items,
    order_discount: body.order_discount ?? undefined,
    order_id: order.id,
    original_total: toFiniteAmount(order.total, "order total"),
    shipping_methods: shippingMethods,
  }
}

export function toApplyCommercialValuesOrder(
  order: CommercialValuesOrder
): ApplyCommercialValuesOrder {
  return {
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
  }
}
