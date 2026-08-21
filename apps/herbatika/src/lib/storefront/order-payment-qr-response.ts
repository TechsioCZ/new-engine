import "server-only"

import QRCode from "qrcode"
import type { HerbatikaCurrencyCode } from "./market-context"
import {
  ORDER_PAYMENT_QR_METADATA_KEY,
  ORDER_QR_PAYMENT_PROVIDER_ID,
} from "./order-payment-qr.constants"

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/
const MONETARY_AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/

export const ORDER_PAYMENT_QR_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "region_id",
  "sales_channel_id",
  "total",
  "currency_code",
  "+metadata",
  "payment_collections.*",
  "payment_collections.payments.*",
  "payment_collections.payments.data",
]

export type StoreOrderResponse = {
  order?: {
    currency_code?: string | null
    custom_display_id?: string | null
    display_id?: number | string | null
    id?: string | null
    metadata?: Record<string, unknown> | null
    payment_collections?: Array<{
      payments?: Array<{
        data?: Record<string, unknown> | null
        provider_id?: string | null
      }> | null
    }> | null
    region_id?: string | null
    sales_channel_id?: string | null
    total?: number | null
  } | null
}

const NOT_APPLICABLE_QR_PAYMENT_RESPONSE = {
  qr_payment: null,
  status: "not_applicable",
} as const
const PENDING_QR_PAYMENT_RESPONSE = {
  qr_payment: null,
  status: "pending",
} as const
const UNAVAILABLE_QR_PAYMENT_RESPONSE = {
  qr_payment: null,
  status: "unavailable",
} as const

export function getNotApplicableQrPaymentResponse() {
  return NOT_APPLICABLE_QR_PAYMENT_RESPONSE
}

export async function mapStoreOrderPaymentQr(
  payload: StoreOrderResponse,
  expectedCurrencyCode: HerbatikaCurrencyCode
) {
  const order = payload.order

  if (!order?.id) {
    return NOT_APPLICABLE_QR_PAYMENT_RESPONSE
  }

  const qrPayment = findQrPayment(order)
  if (!qrPayment) {
    return NOT_APPLICABLE_QR_PAYMENT_RESPONSE
  }

  const spayd =
    readString(qrPayment.data?.[ORDER_PAYMENT_QR_METADATA_KEY]) ??
    readString(order.metadata?.[ORDER_PAYMENT_QR_METADATA_KEY])
  if (!spayd) {
    return PENDING_QR_PAYMENT_RESPONSE
  }

  const spaydFields = parseSpaydFields(spayd)
  if (!spaydFields) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }
  const iban = readString(spaydFields.ACC)
  if (!iban) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }

  const spaydCurrencyCode = readCurrencyCode(spaydFields.CC)
  const orderCurrencyCode = readCurrencyCode(order.currency_code)
  if (
    spaydCurrencyCode !== expectedCurrencyCode ||
    orderCurrencyCode !== expectedCurrencyCode
  ) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }

  const spaydAmount = readMonetaryAmount(spaydFields.AM)
  const orderAmount = readMonetaryAmount(order.total)
  if (
    !(spaydAmount && orderAmount) ||
    spaydAmount.minorUnits !== orderAmount.minorUnits
  ) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }

  const qrSvg = await createQrSvg(spayd)
  if (!qrSvg) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }

  const orderDisplayId =
    readString(order.custom_display_id) ??
    readString(order.display_id) ??
    order.id

  return {
    qr_payment: {
      amount: spaydAmount.amount,
      currency_code: expectedCurrencyCode,
      iban,
      message: readString(spaydFields.MSG),
      order_display_id: orderDisplayId,
      order_id: order.id,
      provider_id: ORDER_QR_PAYMENT_PROVIDER_ID,
      qr_svg: qrSvg,
      spayd,
      variable_symbol: readString(spaydFields["X-VS"]),
    },
    status: "ready",
  } as const
}

async function createQrSvg(spayd: string) {
  try {
    return await QRCode.toString(spayd, {
      errorCorrectionLevel: "M",
      margin: 4,
      type: "svg",
    })
  } catch {
    return null
  }
}

function findQrPayment(order: NonNullable<StoreOrderResponse["order"]>) {
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      if (payment.provider_id === ORDER_QR_PAYMENT_PROVIDER_ID) {
        return payment
      }
    }
  }

  return null
}

function parseSpaydFields(spayd: string) {
  const fields: Record<string, string> = {}

  for (const part of spayd.split("*")) {
    const separatorIndex = part.indexOf(":")
    if (separatorIndex <= 0) {
      continue
    }

    const key = part.slice(0, separatorIndex)
    if (Object.hasOwn(fields, key)) {
      return null
    }
    fields[key] = part.slice(separatorIndex + 1)
  }

  return fields
}

function readCurrencyCode(value: unknown) {
  const currencyCode = readString(value)?.toUpperCase()
  return currencyCode && CURRENCY_CODE_PATTERN.test(currencyCode)
    ? currencyCode
    : null
}

function readString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function readMonetaryAmount(value: unknown) {
  let normalized: string | null
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > Number.MAX_SAFE_INTEGER / 100
    ) {
      return null
    }
    normalized = value.toFixed(2)
    if (Number(normalized) !== value) {
      return null
    }
  } else {
    normalized = readString(value)
  }

  const match = normalized ? MONETARY_AMOUNT_PATTERN.exec(normalized) : null
  if (!match) {
    return null
  }

  const wholeUnits = Number(match[1])
  const fractionalUnits = Number((match[2] ?? "").padEnd(2, "0"))
  if (
    !Number.isSafeInteger(wholeUnits) ||
    wholeUnits > Math.floor(Number.MAX_SAFE_INTEGER / 100)
  ) {
    return null
  }

  const minorUnits = wholeUnits * 100 + fractionalUnits
  if (!Number.isSafeInteger(minorUnits) || minorUnits <= 0) {
    return null
  }

  return { amount: Number(minorUnits) / 100, minorUnits }
}
