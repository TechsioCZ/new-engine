import type { HerbatikaCurrencyCode } from "./market-context"
import {
  type StorefrontOrderPaymentQrStatus as BaseStorefrontOrderPaymentQrStatus,
  ORDER_QR_PAYMENT_PROVIDER_ID as ORDER_QR_PAYMENT_PROVIDER_ID_VALUE,
} from "./order-payment-qr.constants"

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/

export const ORDER_QR_PAYMENT_PROVIDER_ID = ORDER_QR_PAYMENT_PROVIDER_ID_VALUE
export type StorefrontOrderPaymentQrStatus = BaseStorefrontOrderPaymentQrStatus

export type StorefrontOrderPaymentQr = {
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

type StoreOrderPaymentQrResponse = {
  qr_payment?: {
    amount?: number | null
    currency_code?: string | null
    iban?: string | null
    message?: string | null
    order_display_id?: string | null
    order_id?: string | null
    provider_id?: string | null
    qr_svg?: string | null
    spayd?: string | null
    variable_symbol?: string | null
  } | null
  status?: StorefrontOrderPaymentQrStatus | null
}

type FetchOrderPaymentQrOptions = {
  expectedCurrencyCode: HerbatikaCurrencyCode
  orderToken?: string
  orderId: string
}

export const fetchOrderPaymentQr = async ({
  expectedCurrencyCode,
  orderToken,
  orderId,
}: FetchOrderPaymentQrOptions): Promise<StorefrontOrderPaymentQrResult> => {
  const response = await fetch(
    `/api/storefront/orders/${encodeURIComponent(orderId)}/qr-payment`,
    {
      body: JSON.stringify(orderToken ? { order_token: orderToken } : {}),
      headers: { "content-type": "application/json" },
      method: "POST",
    }
  )

  if (!response.ok) {
    throw new Error(`QR payment request failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as StoreOrderPaymentQrResponse

  return mapOrderPaymentQr(payload, expectedCurrencyCode)
}

export const hasOrderPaymentQrAuthority = ({
  isAuthenticated,
  orderToken,
}: Readonly<{
  isAuthenticated: boolean
  orderToken?: string
}>): boolean =>
  isAuthenticated ||
  (typeof orderToken === "string" &&
    orderToken.length > 0 &&
    orderToken.length <= 512 &&
    orderToken === orderToken.trim() &&
    !orderToken.includes("\0"))

function mapOrderPaymentQr(
  payload: StoreOrderPaymentQrResponse,
  expectedCurrencyCode: HerbatikaCurrencyCode
): StorefrontOrderPaymentQrResult {
  const status = normalizeQrPaymentStatus(payload.status)
  const qrPayment = payload.qr_payment

  if (status !== "ready") {
    return { qrPayment: null, status }
  }

  if (
    !qrPayment ||
    qrPayment.provider_id !== ORDER_QR_PAYMENT_PROVIDER_ID ||
    typeof qrPayment.iban !== "string" ||
    typeof qrPayment.order_id !== "string" ||
    typeof qrPayment.qr_svg !== "string" ||
    typeof qrPayment.spayd !== "string"
  ) {
    return { qrPayment: null, status: "unavailable" }
  }

  const responseCurrencyCode = normalizeCurrencyCode(qrPayment.currency_code)
  const spaydCurrencyCode = readSpaydCurrencyCode(qrPayment.spayd)
  if (
    responseCurrencyCode !== expectedCurrencyCode ||
    spaydCurrencyCode !== expectedCurrencyCode
  ) {
    return { qrPayment: null, status: "unavailable" }
  }

  return {
    qrPayment: {
      amount:
        typeof qrPayment.amount === "number" &&
        Number.isFinite(qrPayment.amount)
          ? qrPayment.amount
          : null,
      currencyCode: expectedCurrencyCode,
      iban: qrPayment.iban,
      message: qrPayment.message ?? null,
      orderDisplayId: qrPayment.order_display_id ?? qrPayment.order_id,
      orderId: qrPayment.order_id,
      providerId: ORDER_QR_PAYMENT_PROVIDER_ID,
      qrSvg: qrPayment.qr_svg,
      spayd: qrPayment.spayd,
      variableSymbol: qrPayment.variable_symbol ?? null,
    },
    status: "ready",
  }
}

function normalizeCurrencyCode(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const currencyCode = value.trim().toUpperCase()
  return CURRENCY_CODE_PATTERN.test(currencyCode) ? currencyCode : null
}

function readSpaydCurrencyCode(spayd: string) {
  const currencyFields = spayd
    .split("*")
    .filter((field) => field.startsWith("CC:"))
  if (currencyFields.length !== 1) {
    return null
  }

  return normalizeCurrencyCode(currencyFields[0]?.slice(3))
}

function normalizeQrPaymentStatus(
  status: StoreOrderPaymentQrResponse["status"]
): StorefrontOrderPaymentQrResult["status"] {
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
