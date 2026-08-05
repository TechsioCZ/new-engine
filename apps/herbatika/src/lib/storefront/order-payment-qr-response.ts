import "server-only"
import QRCode from "qrcode"

import {
  ORDER_PAYMENT_QR_METADATA_KEY,
  ORDER_QR_PAYMENT_PROVIDER_ID,
} from "./order-payment-qr.constants"

export const ORDER_PAYMENT_QR_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "total",
  "currency_code",
  "+metadata",
  "payment_collections.*",
  "payment_collections.payments.*",
  "payment_collections.payments.data",
]

export interface StoreOrderResponse {
  order?: {
    currency_code?: string | null
    custom_display_id?: string | null
    display_id?: number | string | null
    id?: string | null
    metadata?: Record<string, unknown> | null
    payment_collections?:
      | {
          payments?:
            | {
                data?: Record<string, unknown> | null
                provider_id?: string | null
              }[]
            | null
        }[]
      | null
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

const createQrSvg = async (spayd: string) => {
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

const findQrPayment = (order: NonNullable<StoreOrderResponse["order"]>) => {
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      if (payment.provider_id === ORDER_QR_PAYMENT_PROVIDER_ID) {
        return payment
      }
    }
  }

  return null
}

const parseSpaydFields = (spayd: string) => {
  const fields: Record<string, string> = {}

  for (const part of spayd.split("*")) {
    const separatorIndex = part.indexOf(":")
    if (separatorIndex <= 0) {
      continue
    }

    fields[part.slice(0, separatorIndex)] = part.slice(separatorIndex + 1)
  }

  return fields
}

const readString = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const readAmount = (value: unknown) => {
  const normalized = readString(value)
  if (normalized === null) {
    return null
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

export const getNotApplicableQrPaymentResponse = () =>
  NOT_APPLICABLE_QR_PAYMENT_RESPONSE

export const mapStoreOrderPaymentQr = async (payload: StoreOrderResponse) => {
  const { order } = payload

  if (order?.id === undefined || order.id === null || order.id === "") {
    return NOT_APPLICABLE_QR_PAYMENT_RESPONSE
  }

  const qrPayment = findQrPayment(order)
  if (qrPayment === null) {
    return NOT_APPLICABLE_QR_PAYMENT_RESPONSE
  }

  const spayd =
    readString(qrPayment.data?.[ORDER_PAYMENT_QR_METADATA_KEY]) ??
    readString(order.metadata?.[ORDER_PAYMENT_QR_METADATA_KEY])
  if (spayd === null) {
    return PENDING_QR_PAYMENT_RESPONSE
  }

  const qrSvg = await createQrSvg(spayd)
  if (qrSvg === null) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }

  const spaydFields = parseSpaydFields(spayd)
  const iban = readString(spaydFields.ACC)
  if (iban === null) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE
  }

  const amount = readAmount(spaydFields.AM) ?? order.total ?? null
  const currencyCode =
    readString(spaydFields.CC)?.toUpperCase() ??
    readString(order.currency_code)?.toUpperCase() ??
    "EUR"
  const orderDisplayId =
    readString(order.custom_display_id) ??
    readString(order.display_id) ??
    order.id

  return {
    qr_payment: {
      amount,
      currency_code: currencyCode,
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
