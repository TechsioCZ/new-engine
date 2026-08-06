import {
  getCredentialString,
  INTEGRATION_CONFIG_NAMES,
  requireCredentialObject,
  retrieveIntegrationConfig,
} from "../modules/api-store/integration-config"

type ReviewRequestDate = Date | string | null

interface ReviewRequestPaymentCollection {
  completed_at?: ReviewRequestDate
  payments?: { captured_at?: ReviewRequestDate }[] | null
  status?: string | null
  updated_at?: ReviewRequestDate
}

export interface ReviewRequestOrder {
  id: string
  customer_id?: string | null
  custom_display_id?: string | null
  display_id: number
  email?: string | null
  payment_collections?: ReviewRequestPaymentCollection[] | null
  payment_status?: string | null
  status?: string | null
}

const DEFAULT_REVIEW_REQUEST_DELAY_MINUTES = 7 * 24 * 60
const MINUTE_IN_MS = 60 * 1000
const PAID_PAYMENT_STATUSES = new Set(["captured", "completed"])
const PRODUCT_REVIEW_REQUEST_PATH = "/reviews/product"
const SKIPPED_ORDER_STATUSES = new Set(["canceled", "archived", "draft"])
const TRAILING_SLASH_REGEX = /\/+$/u

export const buildProductReviewRequestUrl = ({
  productId,
  storefrontUrl,
  token,
}: {
  productId: string
  storefrontUrl: string
  token: string
}) => {
  const baseUrl = storefrontUrl.replace(TRAILING_SLASH_REGEX, "")
  const encodedToken = encodeURIComponent(token)
  const searchParams = new URLSearchParams({ product_id: productId })

  return `${baseUrl}${PRODUCT_REVIEW_REQUEST_PATH}/${encodedToken}?${searchParams.toString()}`
}

const getReviewRequestDelayMs = () => {
  const configuredMinutes = Number(
    process.env["PRODUCT_REVIEW_REQUEST_DELAY_MINUTES"],
  )

  if (Number.isFinite(configuredMinutes) && configuredMinutes >= 0) {
    return configuredMinutes * MINUTE_IN_MS
  }

  return DEFAULT_REVIEW_REQUEST_DELAY_MINUTES * MINUTE_IN_MS
}

const toDate = (value?: ReviewRequestDate): Date | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const getEarliestDate = (dates: Date[]): Date | undefined => {
  let earliest: Date | undefined
  for (const date of dates) {
    if (earliest === undefined || date.getTime() < earliest.getTime()) {
      earliest = date
    }
  }
  return earliest
}

export const getOrderPaidAt = (order: ReviewRequestOrder) => {
  const paidDates: Date[] = []

  for (const collection of order.payment_collections ?? []) {
    if (!PAID_PAYMENT_STATUSES.has(collection.status ?? "")) {
      continue
    }

    const completedAt = toDate(collection.completed_at)
    if (completedAt) {
      paidDates.push(completedAt)
    }

    for (const payment of collection.payments ?? []) {
      const capturedAt = toDate(payment.captured_at)
      if (capturedAt) {
        paidDates.push(capturedAt)
      }
    }

    const updatedAt = toDate(collection.updated_at)
    if (updatedAt) {
      paidDates.push(updatedAt)
    }
  }

  return getEarliestDate(paidDates)
}

export const isPaidOrder = (order: ReviewRequestOrder) => {
  if (typeof order.email !== "string" || order.email.length === 0) {
    return false
  }

  if (
    typeof order.status === "string" &&
    SKIPPED_ORDER_STATUSES.has(order.status)
  ) {
    return false
  }

  if (PAID_PAYMENT_STATUSES.has(order.payment_status ?? "")) {
    return true
  }

  return (order.payment_collections ?? []).some((collection) =>
    PAID_PAYMENT_STATUSES.has(collection.status ?? ""),
  )
}

export const getReviewRequestRunAt = (
  order: ReviewRequestOrder,
): Date | undefined => {
  const paidAt = getOrderPaidAt(order)
  if (paidAt === undefined) {
    return undefined
  }

  return new Date(paidAt.getTime() + getReviewRequestDelayMs())
}

export const getReviewRequestMessage = async (
  container?: Record<string, unknown>,
) => {
  if (container) {
    const config = await retrieveIntegrationConfig(
      container,
      INTEGRATION_CONFIG_NAMES.PRODUCT_REVIEW_REQUEST,
    )

    if (config?.enabled === true) {
      const credentials = requireCredentialObject(config)
      const message = getCredentialString(
        credentials,
        "message",
        "message_cs",
        "cs",
      )

      if (message !== undefined && message !== "") {
        return message
      }
    }
  }

  return "Napiš recenzi produktu"
}
