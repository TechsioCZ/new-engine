import {
  type StorefrontOrderPaymentQrStatus as BaseStorefrontOrderPaymentQrStatus,
  ORDER_QR_PAYMENT_PROVIDER_ID as ORDER_QR_PAYMENT_PROVIDER_ID_VALUE,
} from "./order-payment-qr.constants"

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
  orderId: string
}

export const fetchOrderPaymentQr = async ({
  orderId,
}: FetchOrderPaymentQrOptions): Promise<StorefrontOrderPaymentQrResult> => {
  const response = await fetch(
    `/api/storefront/orders/${encodeURIComponent(orderId)}/qr-payment`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw new Error(`QR payment request failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as StoreOrderPaymentQrResponse

  return mapOrderPaymentQr(payload)
}

function mapOrderPaymentQr(
  payload: StoreOrderPaymentQrResponse
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

  return {
    qrPayment: {
      amount:
        typeof qrPayment.amount === "number" &&
        Number.isFinite(qrPayment.amount)
          ? qrPayment.amount
          : null,
      currencyCode: qrPayment.currency_code?.trim().toUpperCase() || "EUR",
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
