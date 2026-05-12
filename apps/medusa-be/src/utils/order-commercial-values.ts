import { MedusaError } from "@medusajs/framework/utils"

export const MANUAL_ITEM_DISCOUNT_CODE = "manual_item_discount"
export const MANUAL_ORDER_DISCOUNT_CODE = "manual_order_discount"
export const MANUAL_SHIPPING_DISCOUNT_CODE = "manual_shipping_discount"

export const MANUAL_DISCOUNT_CODES = new Set([
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
  MANUAL_SHIPPING_DISCOUNT_CODE,
])

export type CommercialDiscountIntent =
  | {
      type: "percentage"
      value_bps: number
    }
  | {
      type: "amount"
      amount: number
    }

export type CommercialAdjustmentInput = {
  amount: number
  code?: string | null
  description?: string | null
  is_tax_inclusive?: boolean | null
  item_id?: string | null
  promotion_id?: string | null
  provider_id?: string | null
  shipping_method_id?: string | null
}

export type CommercialValuesItemInput = {
  current_subtotal?: number | null
  current_tax_total?: number | null
  item_id: string
  original_unit_price: number
  quantity: number
  unit_price: number
  discount?: CommercialDiscountIntent | null
  existing_adjustments?: CommercialAdjustmentInput[] | null
  is_discountable?: boolean | null
  is_tax_inclusive?: boolean | null
}

export type CommercialValuesCalculationInput = {
  currency_code: string
  expected_order_version: number
  items: CommercialValuesItemInput[]
  order_discount?: CommercialDiscountIntent | null
  order_id: string
  original_total: number
  shipping_methods?: CommercialValuesShippingMethodInput[]
}

export type CommercialValuesRequest = {
  expected_order_version: number
  internal_note?: string
  items: Array<{
    discount?: CommercialDiscountIntent | null
    item_id: string
    unit_price: number
  }>
  order_discount?: CommercialDiscountIntent | null
  shipping_methods?: Array<{
    discount?: CommercialDiscountIntent | null
    shipping_method_id: string
  }>
}

export type CommercialValuesConfirmRequest = CommercialValuesRequest & {
  confirmation_mode?: "confirm" | "request"
}

export type CommercialValuesSnapshotItem = {
  existing_adjustments: CommercialAdjustmentInput[]
  is_discountable: boolean
  item_id: string
  original_unit_price: number
  product_title?: string | null
  quantity: number
  subtitle?: string | null
  thumbnail?: string | null
  title?: string | null
  unit_price: number
  variant_sku?: string | null
  variant_title?: string | null
}

export type CommercialValuesSnapshotShippingMethod = {
  current_subtotal: number
  current_tax_total: number
  existing_adjustments: CommercialAdjustmentInput[]
  name?: string | null
  shipping_method_id: string
}

export type CommercialValuesEditBlocker =
  | {
      code: "order_status_not_editable"
      status: string
    }
  | {
      code: "active_order_change_exists"
      order_change_id: string
    }

export type CommercialValuesSnapshot = {
  active_order_change?: {
    change_type?: string | null
    id: string
    status: "pending" | "requested"
    version: number
  }
  currency_code: string
  editable: boolean
  edit_blockers: CommercialValuesEditBlocker[]
  expected_order_version: number
  items: CommercialValuesSnapshotItem[]
  order_id: string
  shipping_methods: CommercialValuesSnapshotShippingMethod[]
  totals: {
    current_total: number
    original_total: number
  }
}

export type CommercialValuesPreviewItem = {
  final_line_total: number
  final_line_total_with_tax: number
  item_id: string
  line_base: number
  manual_item_discount_amount: number
  manual_order_discount_amount: number
  preserved_adjustment_amount: number
  quantity: number
  requested_unit_price: number
  original_unit_price: number
  tax_total: number
}

export type CommercialValuesPreviewShippingMethod = {
  current_subtotal: number
  current_tax_total: number
  final_total: number
  final_total_with_tax: number
  manual_order_discount_amount: number
  manual_shipping_discount_amount: number
  preserved_adjustment_amount: number
  shipping_method_id: string
  tax_total: number
}

export type CommercialValuesPreview = {
  currency_code: string
  delta: number
  expected_order_version: number
  item_subtotal_after_item_discounts: number
  items: CommercialValuesPreviewItem[]
  new_total: number
  order_discount_total: number
  order_id: string
  original_total: number
  shipping_discount_total: number
  shipping_methods: CommercialValuesPreviewShippingMethod[]
}

export type CommercialValuesConfirmResponse = {
  mode: "confirmed" | "requested"
  order_change_id: string
  order_preview: unknown
  preview: CommercialValuesPreview
}

export class CommercialValuesValidationError extends MedusaError {
  constructor(message: string, code: string) {
    super(MedusaError.Types.INVALID_DATA, message, code)
    this.name = "CommercialValuesValidationError"
  }
}

type ItemCalculation = CommercialValuesPreviewItem & {
  discountable_base: number
  input_index: number
  source_item: CommercialValuesItemInput
}

export type CommercialValuesShippingMethodInput = {
  current_subtotal: number
  current_tax_total?: number | null
  discount?: CommercialDiscountIntent | null
  existing_adjustments?: CommercialAdjustmentInput[] | null
  name?: string | null
  shipping_method_id: string
}

type ShippingCalculation = CommercialValuesPreviewShippingMethod & {
  discountable_base: number
  input_index: number
  source_shipping_method: CommercialValuesShippingMethodInput
}

type DiscountAllocationTarget = {
  discountable_base: number
  input_index: number
}

function assertInteger(value: number, code: string, label: string) {
  if (!Number.isSafeInteger(value)) {
    throw new CommercialValuesValidationError(
      `${label} must be a safe integer`,
      code
    )
  }
}

function assertFiniteAmount(value: number, code: string, label: string) {
  if (!Number.isFinite(value)) {
    throw new CommercialValuesValidationError(
      `${label} must be a finite number`,
      code
    )
  }
}

function assertNonNegativeAmount(value: number, code: string, label: string) {
  assertFiniteAmount(value, code, label)

  if (value < 0) {
    throw new CommercialValuesValidationError(
      `${label} must be non-negative`,
      code
    )
  }
}

function assertPositiveAmount(value: number, code: string, label: string) {
  assertFiniteAmount(value, code, label)

  if (value <= 0) {
    throw new CommercialValuesValidationError(
      `${label} must be greater than zero`,
      code
    )
  }
}

function validateDiscountIntent(
  discount: CommercialDiscountIntent | null | undefined,
  scope: "item" | "order" | "shipping"
) {
  if (!discount) {
    return
  }

  if (discount.type === "percentage") {
    assertInteger(
      discount.value_bps,
      `${scope}_discount_percentage_invalid`,
      `${scope} discount percentage`
    )

    if (discount.value_bps < 0 || discount.value_bps > 10_000) {
      throw new CommercialValuesValidationError(
        `${scope} discount percentage must be between 0 and 10000 bps`,
        `${scope}_discount_percentage_invalid`
      )
    }
    return
  }

  if (discount.type === "amount") {
    assertNonNegativeAmount(
      discount.amount,
      `${scope}_discount_amount_invalid`,
      `${scope} discount amount`
    )
    return
  }

  throw new CommercialValuesValidationError(
    `${scope} discount type is not supported`,
    `${scope}_discount_type_invalid`
  )
}

function calculateDiscountAmount(
  discount: CommercialDiscountIntent | null | undefined,
  base: number,
  scope: "item" | "order" | "shipping"
) {
  validateDiscountIntent(discount, scope)

  if (!discount) {
    return 0
  }

  if (discount.type === "percentage") {
    return (base * discount.value_bps) / 10_000
  }

  if (discount.amount > base) {
    throw new CommercialValuesValidationError(
      `${scope} discount amount cannot exceed the eligible base`,
      `${scope}_discount_amount_exceeds_base`
    )
  }

  return discount.amount
}

export function isManualDiscountAdjustment(
  adjustment: Pick<CommercialAdjustmentInput, "code">
) {
  return typeof adjustment.code === "string"
    ? MANUAL_DISCOUNT_CODES.has(adjustment.code)
    : false
}

export function getPreservedAdjustmentAmount(
  adjustments: CommercialAdjustmentInput[] | null | undefined
) {
  return (adjustments ?? []).reduce((total, adjustment) => {
    assertNonNegativeAmount(
      adjustment.amount,
      "adjustment_amount_invalid",
      "adjustment amount"
    )

    return isManualDiscountAdjustment(adjustment)
      ? total
      : total + adjustment.amount
  }, 0)
}

function getCurrentAdjustmentAmount(
  adjustments: CommercialAdjustmentInput[] | null | undefined
) {
  return (adjustments ?? []).reduce((total, adjustment) => {
    assertNonNegativeAmount(
      adjustment.amount,
      "adjustment_amount_invalid",
      "adjustment amount"
    )

    return total + adjustment.amount
  }, 0)
}

function canAllocateAsIntegers(
  totalAmount: number,
  items: DiscountAllocationTarget[]
) {
  return (
    Number.isSafeInteger(totalAmount) &&
    items.every((item) => Number.isSafeInteger(item.discountable_base))
  )
}

function allocateAmount(
  totalAmount: number,
  items: DiscountAllocationTarget[]
) {
  const allocations = new Array(items.length).fill(0) as number[]

  if (totalAmount === 0) {
    return allocations
  }

  const eligibleItems = items.filter((item) => item.discountable_base > 0)
  const totalBase = eligibleItems.reduce(
    (total, item) => total + item.discountable_base,
    0
  )

  if (totalBase <= 0) {
    throw new CommercialValuesValidationError(
      "Order discount requires at least one eligible item",
      "order_discount_no_eligible_items"
    )
  }

  if (!canAllocateAsIntegers(totalAmount, eligibleItems)) {
    let allocated = 0

    eligibleItems.forEach((item, index) => {
      const amount =
        index === eligibleItems.length - 1
          ? totalAmount - allocated
          : (totalAmount * item.discountable_base) / totalBase

      allocations[item.input_index] = amount
      allocated += amount
    })

    return allocations
  }

  const totalBaseBig = BigInt(totalBase)
  const ranked = eligibleItems.map((item) => {
    const numerator = BigInt(totalAmount) * BigInt(item.discountable_base)
    const floorShare = Number(numerator / totalBaseBig)
    const remainder = numerator % totalBaseBig

    allocations[item.input_index] = floorShare

    return {
      base: item.discountable_base,
      index: item.input_index,
      remainder,
    }
  })

  const allocated = allocations.reduce((total, amount) => total + amount, 0)
  let remaining = totalAmount - allocated

  ranked.sort((a, b) => {
    if (a.remainder !== b.remainder) {
      return a.remainder > b.remainder ? -1 : 1
    }

    if (a.base !== b.base) {
      return b.base - a.base
    }

    return a.index - b.index
  })

  for (const item of ranked) {
    if (remaining <= 0) {
      break
    }

    allocations[item.index] = (allocations[item.index] ?? 0) + 1
    remaining -= 1
  }

  return allocations
}

function calculateShippingMethod(
  shippingMethod: CommercialValuesShippingMethodInput,
  inputIndex: number
): ShippingCalculation {
  assertNonNegativeAmount(
    shippingMethod.current_subtotal,
    "shipping_subtotal_invalid",
    "shipping subtotal"
  )

  const currentTaxTotal = getShippingMethodTaxTotal(shippingMethod)
  const preservedAdjustmentAmount = getPreservedAdjustmentAmount(
    shippingMethod.existing_adjustments
  )
  const discountableBase = Math.max(
    shippingMethod.current_subtotal - preservedAdjustmentAmount,
    0
  )
  const manualShippingDiscountAmount = calculateDiscountAmount(
    shippingMethod.discount,
    discountableBase,
    "shipping"
  )
  const finalTotal = discountableBase - manualShippingDiscountAmount

  return {
    current_subtotal: shippingMethod.current_subtotal,
    current_tax_total: currentTaxTotal,
    discountable_base: finalTotal,
    final_total: finalTotal,
    final_total_with_tax: finalTotal,
    input_index: inputIndex,
    manual_order_discount_amount: 0,
    manual_shipping_discount_amount: manualShippingDiscountAmount,
    preserved_adjustment_amount: preservedAdjustmentAmount,
    shipping_method_id: shippingMethod.shipping_method_id,
    source_shipping_method: shippingMethod,
    tax_total: 0,
  }
}

function calculateItem(
  item: CommercialValuesItemInput,
  inputIndex: number
): ItemCalculation {
  assertPositiveAmount(item.quantity, "item_quantity_invalid", "item quantity")
  assertNonNegativeAmount(
    item.original_unit_price,
    "original_unit_price_invalid",
    "original unit price"
  )
  assertNonNegativeAmount(item.unit_price, "unit_price_invalid", "unit price")

  const lineBase = item.unit_price * item.quantity
  assertNonNegativeAmount(lineBase, "line_base_invalid", "line base")

  const preservedAdjustmentAmount = getPreservedAdjustmentAmount(
    item.existing_adjustments
  )
  const discountableBase = Math.max(lineBase - preservedAdjustmentAmount, 0)

  if (item.is_discountable === false && item.discount) {
    throw new CommercialValuesValidationError(
      "Item discount cannot be applied to a non-discountable item",
      "item_discount_not_discountable"
    )
  }

  const manualItemDiscountAmount = calculateDiscountAmount(
    item.discount,
    discountableBase,
    "item"
  )
  const lineAfterItemDiscount = discountableBase - manualItemDiscountAmount
  const taxTotal = calculateItemTaxTotal(item, lineAfterItemDiscount)

  return {
    discountable_base:
      item.is_discountable === false ? 0 : lineAfterItemDiscount,
    final_line_total: lineAfterItemDiscount,
    input_index: inputIndex,
    item_id: item.item_id,
    line_base: lineBase,
    manual_item_discount_amount: manualItemDiscountAmount,
    manual_order_discount_amount: 0,
    original_unit_price: item.original_unit_price,
    preserved_adjustment_amount: preservedAdjustmentAmount,
    quantity: item.quantity,
    requested_unit_price: item.unit_price,
    source_item: item,
    tax_total: taxTotal,
    final_line_total_with_tax: item.is_tax_inclusive
      ? lineAfterItemDiscount
      : lineAfterItemDiscount + taxTotal,
  }
}

function getOriginalItemTotal(item: CommercialValuesItemInput) {
  if (item.current_subtotal !== null && item.current_subtotal !== undefined) {
    assertNonNegativeAmount(
      item.current_subtotal,
      "current_subtotal_invalid",
      "current item subtotal"
    )

    return item.current_subtotal
  }

  const originalLineBase = item.original_unit_price * item.quantity
  const currentAdjustmentAmount = getCurrentAdjustmentAmount(
    item.existing_adjustments
  )

  return Math.max(originalLineBase - currentAdjustmentAmount, 0)
}

function getOriginalItemTaxTotal(item: CommercialValuesItemInput) {
  if (item.current_tax_total === null || item.current_tax_total === undefined) {
    return 0
  }

  assertNonNegativeAmount(
    item.current_tax_total,
    "current_tax_total_invalid",
    "current item tax total"
  )

  return item.current_tax_total
}

function getOriginalItemTotalWithTax(item: CommercialValuesItemInput) {
  const originalItemTotal = getOriginalItemTotal(item)
  const originalTaxTotal = getOriginalItemTaxTotal(item)

  if (
    item.is_tax_inclusive &&
    (item.current_subtotal === null || item.current_subtotal === undefined)
  ) {
    return originalItemTotal
  }

  return originalItemTotal + originalTaxTotal
}

function calculateItemTaxTotal(
  item: CommercialValuesItemInput,
  newSubtotal: number
) {
  const currentSubtotal = getOriginalItemTotal(item)
  const currentTaxTotal = getOriginalItemTaxTotal(item)

  if (currentTaxTotal === 0) {
    return 0
  }

  if (currentSubtotal <= 0) {
    return newSubtotal === currentSubtotal ? currentTaxTotal : 0
  }

  return (newSubtotal * currentTaxTotal) / currentSubtotal
}

function getShippingMethodTaxTotal(
  shippingMethod: CommercialValuesShippingMethodInput
) {
  if (
    shippingMethod.current_tax_total === null ||
    shippingMethod.current_tax_total === undefined
  ) {
    return 0
  }

  assertNonNegativeAmount(
    shippingMethod.current_tax_total,
    "shipping_tax_total_invalid",
    "shipping tax total"
  )

  return shippingMethod.current_tax_total
}

function calculateShippingMethodTaxTotal(
  shippingMethod: CommercialValuesShippingMethodInput,
  newSubtotal: number
) {
  const currentSubtotal = shippingMethod.current_subtotal
  const currentTaxTotal = getShippingMethodTaxTotal(shippingMethod)

  if (currentTaxTotal === 0) {
    return 0
  }

  if (currentSubtotal <= 0) {
    return newSubtotal === currentSubtotal ? currentTaxTotal : 0
  }

  return (newSubtotal * currentTaxTotal) / currentSubtotal
}

export function calculateCommercialValuesPreview(
  input: CommercialValuesCalculationInput
): CommercialValuesPreview {
  assertInteger(
    input.expected_order_version,
    "expected_order_version_invalid",
    "expected order version"
  )
  assertNonNegativeAmount(
    input.original_total,
    "original_total_invalid",
    "original total"
  )

  if (!input.items.length) {
    throw new CommercialValuesValidationError(
      "At least one item is required",
      "items_required"
    )
  }

  validateDiscountIntent(input.order_discount, "order")

  const itemCalculations = input.items.map(calculateItem)
  const shippingCalculations = (input.shipping_methods ?? []).map(
    calculateShippingMethod
  )
  const itemSubtotalAfterItemDiscounts = itemCalculations.reduce(
    (total, item) => total + item.final_line_total,
    0
  )
  const orderDiscountTargets = [
    ...itemCalculations,
    ...shippingCalculations.map((shippingMethod, index) => ({
      ...shippingMethod,
      input_index: itemCalculations.length + index,
    })),
  ]
  const eligibleOrderDiscountBase = orderDiscountTargets.reduce(
    (total, target) => total + target.discountable_base,
    0
  )
  if (input.order_discount && eligibleOrderDiscountBase <= 0) {
    throw new CommercialValuesValidationError(
      "Order discount requires at least one eligible item",
      "order_discount_no_eligible_items"
    )
  }

  const orderDiscountTotal = calculateDiscountAmount(
    input.order_discount,
    eligibleOrderDiscountBase,
    "order"
  )
  const orderAllocations = allocateAmount(
    orderDiscountTotal,
    orderDiscountTargets
  )

  const items = itemCalculations.map((item, index) => {
    const manualOrderDiscountAmount = orderAllocations[index] ?? 0
    const finalLineTotal = item.final_line_total - manualOrderDiscountAmount
    const taxTotal = calculateItemTaxTotal(item.source_item, finalLineTotal)

    return {
      final_line_total: finalLineTotal,
      final_line_total_with_tax: item.source_item.is_tax_inclusive
        ? finalLineTotal
        : finalLineTotal + taxTotal,
      item_id: item.item_id,
      line_base: item.line_base,
      manual_item_discount_amount: item.manual_item_discount_amount,
      manual_order_discount_amount: manualOrderDiscountAmount,
      original_unit_price: item.original_unit_price,
      preserved_adjustment_amount: item.preserved_adjustment_amount,
      quantity: item.quantity,
      requested_unit_price: item.requested_unit_price,
      tax_total: taxTotal,
    }
  })
  const shippingMethods = shippingCalculations.map((shippingMethod, index) => {
    const manualOrderDiscountAmount =
      orderAllocations[itemCalculations.length + index] ?? 0
    const finalTotal = shippingMethod.final_total - manualOrderDiscountAmount
    const taxTotal = calculateShippingMethodTaxTotal(
      shippingMethod.source_shipping_method,
      finalTotal
    )

    return {
      current_subtotal: shippingMethod.current_subtotal,
      current_tax_total: shippingMethod.current_tax_total,
      final_total: finalTotal,
      final_total_with_tax: finalTotal + taxTotal,
      manual_order_discount_amount: manualOrderDiscountAmount,
      manual_shipping_discount_amount:
        shippingMethod.manual_shipping_discount_amount,
      preserved_adjustment_amount: shippingMethod.preserved_adjustment_amount,
      shipping_method_id: shippingMethod.shipping_method_id,
      tax_total: taxTotal,
    }
  })

  const originalItemsTotalWithTax = input.items.reduce(
    (total, item) => total + getOriginalItemTotalWithTax(item),
    0
  )
  const originalShippingTotalWithTax = (input.shipping_methods ?? []).reduce(
    (total, shippingMethod) =>
      total +
      shippingMethod.current_subtotal +
      getShippingMethodTaxTotal(shippingMethod),
    0
  )
  const unchangedTotalComponent =
    input.original_total -
    originalItemsTotalWithTax -
    originalShippingTotalWithTax
  const newItemsTotal = items.reduce(
    (total, item) => total + item.final_line_total_with_tax,
    0
  )
  const newShippingTotal = shippingMethods.reduce(
    (total, shippingMethod) => total + shippingMethod.final_total_with_tax,
    0
  )
  const newTotal = unchangedTotalComponent + newItemsTotal + newShippingTotal

  return {
    currency_code: input.currency_code,
    delta: newTotal - input.original_total,
    expected_order_version: input.expected_order_version,
    item_subtotal_after_item_discounts: itemSubtotalAfterItemDiscounts,
    items,
    new_total: newTotal,
    order_discount_total: orderDiscountTotal,
    order_id: input.order_id,
    original_total: input.original_total,
    shipping_discount_total: shippingCalculations.reduce(
      (total, shippingMethod) =>
        total + shippingMethod.manual_shipping_discount_amount,
      0
    ),
    shipping_methods: shippingMethods,
  }
}
