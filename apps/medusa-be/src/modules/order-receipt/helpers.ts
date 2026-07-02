type OrderReceiptMoney =
  | number
  | string
  | {
      amount?: number | string | null
      precision?: number | string | null
      value?: number | string | null
    }
  | null

export type OrderReceiptAddress = {
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  company?: string | null
  country_code?: string | null
  first_name?: string | null
  last_name?: string | null
  postal_code?: string | null
}

export type OrderReceiptLineItem = {
  detail?: {
    quantity?: OrderReceiptMoney
    raw_quantity?: OrderReceiptMoney
    raw_unit_price?: OrderReceiptMoney
    title?: string | null
    unit_price?: OrderReceiptMoney
  } | null
  is_tax_inclusive?: boolean | null
  raw_quantity?: OrderReceiptMoney
  raw_unit_price?: OrderReceiptMoney
  subtotal?: OrderReceiptMoney
  tax_lines?: Array<{
    rate?: OrderReceiptMoney
  } | null> | null
  tax_total?: OrderReceiptMoney
  quantity?: OrderReceiptMoney
  title?: string | null
  unit_price?: OrderReceiptMoney
  total?: OrderReceiptMoney
}

export type OrderReceiptPayment = {
  data?: Record<string, unknown> | null
  provider_id?: string | null
}

export type OrderReceiptPaymentCollection = {
  payments?: OrderReceiptPayment[] | null
}

export type OrderReceiptSummary = {
  accounting_total?: OrderReceiptMoney
  current_order_total?: OrderReceiptMoney
  original_order_total?: OrderReceiptMoney
}

export type OrderReceiptShippingMethod = {
  amount?: OrderReceiptMoney
  is_tax_inclusive?: boolean | null
  name?: string | null
  raw_amount?: OrderReceiptMoney
  subtotal?: OrderReceiptMoney
  tax_lines?: Array<{
    rate?: OrderReceiptMoney
  } | null> | null
  tax_total?: OrderReceiptMoney
  total?: OrderReceiptMoney
}

export type OrderReceiptOrder = {
  billing_address?: OrderReceiptAddress | null
  created_at?: Date | string | null
  currency_code?: string | null
  display_id?: number | string | null
  discount_total?: OrderReceiptMoney
  email?: string | null
  id: string
  item_subtotal?: OrderReceiptMoney
  item_tax_total?: OrderReceiptMoney
  items?: OrderReceiptLineItem[] | null
  metadata?: Record<string, unknown> | null
  payment_collections?: OrderReceiptPaymentCollection[] | null
  shipping_methods?: OrderReceiptShippingMethod[] | null
  shipping_total?: OrderReceiptMoney
  shipping_tax_total?: OrderReceiptMoney
  shipping_address?: OrderReceiptAddress | null
  subtotal?: OrderReceiptMoney
  summary?: OrderReceiptSummary | null
  tax_total?: OrderReceiptMoney
  total?: OrderReceiptMoney
}

export type OrderReceiptAttachment = {
  content: Buffer
  content_type: "application/pdf"
  filename: string
}

function objectToNumberValue(
  value: Exclude<OrderReceiptMoney, number | string | null>
): number {
  const explicitValue = value.value ?? value.amount
  if (explicitValue !== null && explicitValue !== undefined) {
    return toNumber(explicitValue)
  }

  if ("toJSON" in value && typeof value.toJSON === "function") {
    return toNumber(value.toJSON() as OrderReceiptMoney)
  }

  if ("toString" in value && typeof value.toString === "function") {
    const stringValue = value.toString()
    if (stringValue !== "[object Object]") {
      return toNumber(stringValue)
    }
  }

  return 0
}

export function toNumber(value: OrderReceiptMoney | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === "object") {
    return objectToNumberValue(value)
  }

  const number = typeof value === "string" ? Number(value) : value

  return Number.isFinite(number) ? number : 0
}

function hasExplicitMoney(value: OrderReceiptMoney | undefined) {
  return value !== null && value !== undefined
}

function getExplicitMoneyTotal(value: OrderReceiptMoney | undefined) {
  return hasExplicitMoney(value) ? toNumber(value) : null
}

export function ascii(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
}

const PDF_DIACRITIC_CODES: Record<string, string> = {
  "A\u0301": "\\300",
  "a\u0301": "\\301",
  "C\u030c": "\\302",
  "c\u030c": "\\303",
  "D\u030c": "\\304",
  "d\u030c": "\\305",
  "E\u0301": "\\306",
  "e\u0301": "\\307",
  "E\u030c": "\\310",
  "e\u030c": "\\311",
  "I\u0301": "\\312",
  "i\u0301": "\\313",
  "N\u030c": "\\314",
  "n\u030c": "\\315",
  "O\u0301": "\\316",
  "o\u0301": "\\317",
  "R\u030c": "\\320",
  "r\u030c": "\\321",
  "S\u030c": "\\322",
  "s\u030c": "\\323",
  "T\u030c": "\\324",
  "t\u030c": "\\325",
  "U\u0301": "\\326",
  "u\u0301": "\\327",
  "U\u030a": "\\330",
  "u\u030a": "\\331",
  "Y\u0301": "\\332",
  "y\u0301": "\\333",
  "Z\u030c": "\\334",
  "z\u030c": "\\335",
}

export const PDF_CZECH_ENCODING_DIFFERENCES =
  "[192 /Aacute /aacute /Ccaron /ccaron /Dcaron /dcaron /Eacute /eacute /Ecaron /ecaron /Iacute /iacute /Ncaron /ncaron /Oacute /oacute /Rcaron /rcaron /Scaron /scaron /Tcaron /tcaron /Uacute /uacute /Uring /uring /Yacute /yacute /Zcaron /zcaron]"

const COMBINING_MARK_PATTERN = /[\u0300-\u036f]/
const PDF_ASCII_PATTERN = /[\x20-\x7E]/

function escapePdfAsciiChar(char: string) {
  return char.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

export function escapePdfText(value: unknown) {
  const normalized = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
  let escaped = ""

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    if (!char) {
      continue
    }

    const nextChar = normalized[index + 1]
    const diacriticCode = nextChar
      ? PDF_DIACRITIC_CODES[`${char}${nextChar}`]
      : undefined

    if (diacriticCode) {
      escaped += diacriticCode
      index += 1
      continue
    }

    if (COMBINING_MARK_PATTERN.test(char)) {
      continue
    }

    if (PDF_ASCII_PATTERN.test(char)) {
      escaped += escapePdfAsciiChar(char)
    }
  }

  return escaped
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date().toISOString().slice(0, 10)
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return new Intl.DateTimeFormat("cs-CZ").format(date)
}

export function formatMoney(
  value: OrderReceiptMoney | undefined,
  currency?: string | null
) {
  const amount = toNumber(value)
  const normalizedCurrency = (currency || "CZK").toUpperCase()

  try {
    return new Intl.NumberFormat("cs-CZ", {
      currency: normalizedCurrency,
      style: "currency",
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`
  }
}

export function getOrderNumber(order: OrderReceiptOrder) {
  return order.display_id ? String(order.display_id) : order.id
}

export function getOrderReceiptFilename(order: OrderReceiptOrder) {
  return `invoice-${ascii(getOrderNumber(order)).replace(
    /[^a-zA-Z0-9_-]/g,
    "-"
  )}.pdf`
}

export function getAddressLines(address?: OrderReceiptAddress | null) {
  if (!address) {
    return []
  }

  const cityLine = [address.postal_code, address.city].filter(Boolean).join(" ")

  return [
    address.company,
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.address_1,
    address.address_2,
    cityLine,
    address.country_code?.toUpperCase(),
  ].filter((addressLine): addressLine is string => Boolean(addressLine))
}

export function getItemTitle(item: OrderReceiptLineItem) {
  return item.title ?? item.detail?.title
}

function getTaxRate(item: {
  tax_lines?: Array<{ rate?: OrderReceiptMoney } | null> | null
}) {
  const rate = item.tax_lines?.find(
    (taxLine) => taxLine?.rate !== null && taxLine?.rate !== undefined
  )?.rate

  if (rate === null || rate === undefined) {
    return 0
  }

  return toNumber(rate)
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getNetFromGross(grossValue: number, rate: number) {
  if (rate <= 0) {
    return grossValue
  }

  return roundMoney(grossValue / (1 + rate / 100))
}

function getTaxExclusiveAmount(
  amount: number,
  rate: number,
  isTaxInclusive?: boolean | null
) {
  return isTaxInclusive === true ? getNetFromGross(amount, rate) : amount
}

export function getItemGrossUnitPrice(item: OrderReceiptLineItem) {
  return toNumber(
    item.unit_price ??
      item.raw_unit_price ??
      item.detail?.unit_price ??
      item.detail?.raw_unit_price
  )
}

export function getItemUnitPrice(item: OrderReceiptLineItem) {
  const unitPrice = getItemGrossUnitPrice(item)
  const rate = getTaxRate(item)

  return getTaxExclusiveAmount(unitPrice, rate, item.is_tax_inclusive)
}

export function getItemTaxLabel(item: OrderReceiptLineItem) {
  const rate = getTaxRate(item)

  return `${rate} %`
}

export function getShippingTaxLabel(
  shippingMethod: OrderReceiptShippingMethod
) {
  const rate = getTaxRate(shippingMethod)

  return `${rate} %`
}

export function getItemQuantity(item: OrderReceiptLineItem) {
  const quantity = toNumber(
    item.quantity ??
      item.detail?.quantity ??
      item.raw_quantity ??
      item.detail?.raw_quantity
  )

  return quantity > 0 ? quantity : 1
}

export function getItemSubtotal(item: OrderReceiptLineItem) {
  const subtotal = getItemSubtotalAmount(item)
  const rate = getTaxRate(item)

  return getTaxExclusiveAmount(subtotal, rate, item.is_tax_inclusive)
}

function getItemSubtotalAmount(item: OrderReceiptLineItem) {
  const quantity = getItemQuantity(item)
  const unitPrice = getItemGrossUnitPrice(item)
  const unitPriceSubtotal = unitPrice * quantity
  const subtotal = toNumber(item.subtotal)

  if (subtotal > 0) {
    if (quantity > 1 && subtotal === unitPrice) {
      return unitPriceSubtotal
    }

    return subtotal
  }

  const total = toNumber(item.total)
  if (total > 0) {
    return total
  }

  return unitPriceSubtotal
}

function getItemsSubtotal(items: OrderReceiptLineItem[]) {
  return items.reduce((sum, item) => sum + getItemSubtotal(item), 0)
}

function getItemTaxTotal(item: OrderReceiptLineItem) {
  const taxTotal = getExplicitMoneyTotal(item.tax_total)
  if (taxTotal !== null) {
    return taxTotal
  }

  const subtotal = getItemSubtotalAmount(item)
  const rate = getTaxRate(item)

  if (rate <= 0) {
    return 0
  }

  if (item.is_tax_inclusive === true) {
    return roundMoney(subtotal - getNetFromGross(subtotal, rate))
  }

  return roundMoney((subtotal * rate) / 100)
}

export function getShippingSubtotal(
  shippingMethod?: OrderReceiptShippingMethod | null
) {
  if (!shippingMethod) {
    return 0
  }

  const grossSubtotal = toNumber(
    shippingMethod.subtotal ??
      shippingMethod.total ??
      shippingMethod.amount ??
      shippingMethod.raw_amount
  )
  const rate = getTaxRate(shippingMethod)

  return getTaxExclusiveAmount(
    grossSubtotal,
    rate,
    shippingMethod.is_tax_inclusive
  )
}

export function getShippingTaxTotal(
  shippingMethod?: OrderReceiptShippingMethod | null
) {
  if (!shippingMethod) {
    return 0
  }

  const taxTotal = getExplicitMoneyTotal(shippingMethod.tax_total)
  if (taxTotal !== null) {
    return Math.max(0, taxTotal)
  }

  const grossSubtotal = toNumber(
    shippingMethod.subtotal ??
      shippingMethod.total ??
      shippingMethod.amount ??
      shippingMethod.raw_amount
  )
  const rate = getTaxRate(shippingMethod)

  if (rate <= 0) {
    return 0
  }

  if (shippingMethod.is_tax_inclusive === true) {
    return roundMoney(grossSubtotal - getNetFromGross(grossSubtotal, rate))
  }

  return roundMoney((grossSubtotal * rate) / 100)
}

export function getSubtotal(order: OrderReceiptOrder) {
  return getItemsSubtotal(order.items ?? [])
}

function getLineItemsTaxTotal(items: OrderReceiptLineItem[]) {
  return items.reduce((sum, item) => sum + getItemTaxTotal(item), 0)
}

function getShippingMethodsTaxTotal(
  shippingMethods: OrderReceiptShippingMethod[]
) {
  return shippingMethods.reduce(
    (sum, shippingMethod) => sum + getShippingTaxTotal(shippingMethod),
    0
  )
}

function hasCompleteRelationTaxSignal(
  relation: Array<{ tax_total?: OrderReceiptMoney }> | null | undefined,
  taxTotal: number | null
) {
  if (!Array.isArray(relation)) {
    return false
  }

  if (taxTotal !== null) {
    return true
  }

  return (
    relation.length > 0 &&
    relation.every((entry) => hasExplicitMoney(entry.tax_total))
  )
}

function getExplicitOrderTaxTotal(order: OrderReceiptOrder) {
  const hasItemsRelation = Array.isArray(order.items)
  const hasShippingMethodsRelation = Array.isArray(order.shipping_methods)
  const items = hasItemsRelation ? (order.items ?? []) : []
  const shippingMethods = hasShippingMethodsRelation
    ? (order.shipping_methods ?? [])
    : []
  const itemTaxTotal = getExplicitMoneyTotal(order.item_tax_total)
  const shippingTaxTotal = getExplicitMoneyTotal(order.shipping_tax_total)
  const clampedShippingTaxTotal =
    shippingTaxTotal === null ? null : Math.max(0, shippingTaxTotal)
  const hasItemTaxSignal = hasCompleteRelationTaxSignal(
    order.items,
    itemTaxTotal
  )
  const hasShippingTaxSignal = hasCompleteRelationTaxSignal(
    order.shipping_methods,
    clampedShippingTaxTotal
  )

  if (hasItemTaxSignal && hasShippingTaxSignal) {
    return roundMoney(
      (itemTaxTotal ?? getLineItemsTaxTotal(items)) +
        (clampedShippingTaxTotal ?? getShippingMethodsTaxTotal(shippingMethods))
    )
  }

  const taxTotal = getExplicitMoneyTotal(order.tax_total)
  if (taxTotal !== null && toNumber(order.discount_total) <= 0) {
    return roundMoney(taxTotal)
  }

  return null
}

export function getTaxTotal(order: OrderReceiptOrder) {
  const explicitTaxTotal = getExplicitOrderTaxTotal(order)
  if (explicitTaxTotal !== null) {
    return explicitTaxTotal
  }

  if (
    order.summary?.current_order_total !== null &&
    order.summary?.current_order_total !== undefined
  ) {
    return Math.max(
      0,
      roundMoney(
        toNumber(order.summary.current_order_total) +
          toNumber(order.discount_total) -
          getSubtotal(order) -
          getShippingSubtotalTotal(order)
      )
    )
  }

  const itemTaxTotal = getLineItemsTaxTotal(order.items ?? [])
  const shippingTaxTotal = getShippingMethodsTaxTotal(
    order.shipping_methods ?? []
  )

  return roundMoney(itemTaxTotal + shippingTaxTotal)
}

export function getShippingSubtotalTotal(order: OrderReceiptOrder) {
  const shippingMethods = order.shipping_methods ?? []

  if (shippingMethods.length > 0) {
    return shippingMethods.reduce(
      (sum, shippingMethod) => sum + getShippingSubtotal(shippingMethod),
      0
    )
  }

  return toNumber(order.shipping_total)
}

export function getTotal(order: OrderReceiptOrder) {
  if (
    order.summary?.current_order_total !== null &&
    order.summary?.current_order_total !== undefined
  ) {
    return toNumber(order.summary.current_order_total)
  }

  if (order.total !== null && order.total !== undefined) {
    return toNumber(order.total)
  }

  if (
    order.summary?.original_order_total !== null &&
    order.summary?.original_order_total !== undefined
  ) {
    return toNumber(order.summary.original_order_total)
  }

  if (
    order.summary?.accounting_total !== null &&
    order.summary?.accounting_total !== undefined
  ) {
    return toNumber(order.summary.accounting_total)
  }

  return 0
}

export function truncate(value: unknown, maxLength: number) {
  const textValue = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim()

  if (textValue.length <= maxLength) {
    return textValue
  }

  return `${textValue.slice(0, maxLength - 1)}.`
}

export function estimateTextWidth(textValue: string, fontSize: number) {
  return ascii(textValue).length * fontSize * 0.52
}

export type PdfFont = "F1" | "F2"
export type PdfCommand = string

export function pdfText(
  value: unknown,
  x: number,
  y: number,
  options: {
    align?: "left" | "right"
    font?: PdfFont
    size?: number
  } = {}
): PdfCommand {
  const fontSize = options.size ?? 10
  const content = escapePdfText(value)
  const alignedX =
    options.align === "right"
      ? x - estimateTextWidth(String(value ?? ""), fontSize)
      : x

  return `BT /${options.font ?? "F1"} ${fontSize} Tf ${alignedX.toFixed(
    2
  )} ${y.toFixed(2)} Td (${content}) Tj ET`
}

export function pdfLine({
  width = 0.8,
  x1,
  x2,
  y1,
  y2,
}: {
  width?: number
  x1: number
  x2: number
  y1: number
  y2: number
}) {
  return `${width} w ${x1} ${y1} m ${x2} ${y2} l S`
}
