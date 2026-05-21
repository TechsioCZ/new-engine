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
  raw_quantity?: OrderReceiptMoney
  raw_unit_price?: OrderReceiptMoney
  subtotal?: OrderReceiptMoney
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
  shipping_total?: OrderReceiptMoney
  shipping_address?: OrderReceiptAddress | null
  subtotal?: OrderReceiptMoney
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

export function getItemUnitPrice(item: OrderReceiptLineItem) {
  return toNumber(
    item.unit_price ??
      item.raw_unit_price ??
      item.detail?.unit_price ??
      item.detail?.raw_unit_price
  )
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
  const quantity = getItemQuantity(item)
  const unitPrice = getItemUnitPrice(item)
  const unitPriceSubtotal = quantity * unitPrice
  const subtotal = toNumber(item.subtotal)
  if (subtotal > 0) {
    if (quantity > 1 && subtotal === unitPrice) {
      return unitPriceSubtotal
    }

    return subtotal
  }

  const total = toNumber(item.total)
  const taxTotal = toNumber(item.tax_total)
  if (total > 0) {
    return Math.max(0, total - taxTotal)
  }

  return unitPriceSubtotal
}

function getItemsSubtotal(items: OrderReceiptLineItem[]) {
  return items.reduce((sum, item) => sum + getItemSubtotal(item), 0)
}

export function getSubtotal(order: OrderReceiptOrder) {
  const itemsSubtotal = getItemsSubtotal(order.items ?? [])

  if (itemsSubtotal > 0) {
    return itemsSubtotal
  }

  if (order.item_subtotal !== null && order.item_subtotal !== undefined) {
    return toNumber(order.item_subtotal)
  }

  if (order.subtotal !== null && order.subtotal !== undefined) {
    return Math.max(
      0,
      toNumber(order.subtotal) - toNumber(order.shipping_total)
    )
  }

  return itemsSubtotal
}

export function getTaxTotal(order: OrderReceiptOrder) {
  if (order.tax_total !== null && order.tax_total !== undefined) {
    return toNumber(order.tax_total)
  }

  if (order.item_tax_total !== null && order.item_tax_total !== undefined) {
    return toNumber(order.item_tax_total)
  }

  return (order.items ?? []).reduce(
    (sum, item) => sum + toNumber(item.tax_total),
    0
  )
}

export function getTotal(order: OrderReceiptOrder) {
  const fallbackTotal =
    getSubtotal(order) +
    toNumber(order.shipping_total) +
    getTaxTotal(order) -
    toNumber(order.discount_total)

  if (order.total !== null && order.total !== undefined) {
    return Math.max(toNumber(order.total), fallbackTotal)
  }

  return fallbackTotal
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
