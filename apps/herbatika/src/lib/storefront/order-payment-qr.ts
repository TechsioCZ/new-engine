import { isRecord, getRecordValue } from "@techsio/std/object"

import { ORDER_QR_PAYMENT_PROVIDER_ID } from "./order-payment-qr.constants"
import type { StorefrontOrderPaymentQrStatus } from "./order-payment-qr.constants"

export interface StorefrontOrderPaymentQr {
  amount: number | null
  currencyCode: string
  iban: string
  message: string | null
  orderDisplayId: string
  orderId: string
  providerId: typeof ORDER_QR_PAYMENT_PROVIDER_ID
  qrSvg: string
  spayd: string
  variableSymbol: string | null
}

export type StorefrontOrderPaymentQrResult =
  | {
      qrPayment: StorefrontOrderPaymentQr
      status: "ready"
    }
  | {
      qrPayment: null
      status: Exclude<StorefrontOrderPaymentQrStatus, "ready">
    }

interface FetchOrderPaymentQrOptions {
  orderId: string
}

interface ReadyQrPayment extends Record<string, unknown> {
  iban: string
  order_id: string
  provider_id: typeof ORDER_QR_PAYMENT_PROVIDER_ID
  qr_svg: string
  spayd: string
}

const normalizeQrPaymentStatus = (
  status: unknown,
): StorefrontOrderPaymentQrResult["status"] => {
  if (
    status === "ready" ||
    status === "pending" ||
    status === "not_applicable" ||
    status === "unavailable"
  ) {
    return status
  }

  return "unavailable"
}

const isReadyQrPayment = (value: unknown): value is ReadyQrPayment => {
  if (!isRecord(value)) {
    return false
  }
  const requiredStrings = [
    getRecordValue(value, "iban"),
    getRecordValue(value, "order_id"),
    getRecordValue(value, "qr_svg"),
    getRecordValue(value, "spayd"),
  ]
  return (
    getRecordValue(value, "provider_id") === ORDER_QR_PAYMENT_PROVIDER_ID &&
    requiredStrings.every((field) => typeof field === "string")
  )
}

const mapOrderPaymentQr = (
  payload: unknown,
): StorefrontOrderPaymentQrResult => {
  if (!isRecord(payload)) {
    return { qrPayment: null, status: "unavailable" }
  }

  const status = normalizeQrPaymentStatus(getRecordValue(payload, "status"))
  const qrPayment = getRecordValue(payload, "qr_payment")

  if (status !== "ready") {
    return { qrPayment: null, status }
  }

  if (!isReadyQrPayment(qrPayment)) {
    return { qrPayment: null, status: "unavailable" }
  }

  const currencyCodeValue = getRecordValue(qrPayment, "currency_code")
  const currencyCode =
    typeof currencyCodeValue === "string"
      ? currencyCodeValue.trim().toUpperCase()
      : "EUR"
  const amountValue = getRecordValue(qrPayment, "amount")
  const messageValue = getRecordValue(qrPayment, "message")
  const orderDisplayIdValue = getRecordValue(qrPayment, "order_display_id")
  const variableSymbolValue = getRecordValue(qrPayment, "variable_symbol")

  return {
    qrPayment: {
      amount:
        typeof amountValue === "number" && Number.isFinite(amountValue)
          ? amountValue
          : null,
      currencyCode,
      iban: qrPayment.iban,
      message: typeof messageValue === "string" ? messageValue : null,
      orderDisplayId:
        typeof orderDisplayIdValue === "string"
          ? orderDisplayIdValue
          : qrPayment.order_id,
      orderId: qrPayment.order_id,
      providerId: ORDER_QR_PAYMENT_PROVIDER_ID,
      qrSvg: qrPayment.qr_svg,
      spayd: qrPayment.spayd,
      variableSymbol:
        typeof variableSymbolValue === "string" ? variableSymbolValue : null,
    },
    status: "ready",
  }
}

export const fetchOrderPaymentQr = async ({
  orderId,
}: FetchOrderPaymentQrOptions): Promise<StorefrontOrderPaymentQrResult> => {
  const response = await fetch(
    `/api/storefront/orders/${encodeURIComponent(orderId)}/qr-payment`,
    { method: "GET" },
  )

  if (!response.ok) {
    throw new Error(`QR payment request failed with status ${response.status}.`)
  }

  const payload: unknown = await response.json()
  return mapOrderPaymentQr(payload)
}
