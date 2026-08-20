import {
  getCredentialString,
  INTEGRATION_CONFIG_NAMES,
  requireCredentialObject,
  retrieveIntegrationConfig,
} from "../modules/api-store/integration-config"
import { buildStorefrontPublicFlowUrl } from "./storefront-public-flow-url"

export type ReviewRequestOrder = {
  id: string
  customer_id?: string | null
  custom_display_id?: string | null
  display_id: number
  email?: string | null
  sales_channel_id?: string | null
  billing_address?: { country_code?: string | null } | null
  shipping_address?: { country_code?: string | null } | null
  payment_collections?:
    | {
        completed_at?: Date | string | null
        payments?: { captured_at?: Date | string | null }[] | null
        status?: string | null
        updated_at?: Date | string | null
      }[]
    | null
  payment_status?: string | null
  status?: string | null
}

const MINUTE_IN_MS = 60 * 1000
const PAID_PAYMENT_STATUSES = new Set(["captured", "completed"])
const SKIPPED_ORDER_STATUSES = new Set(["canceled", "archived", "draft"])

const REVIEW_REQUEST_COPY = {
  "cs-CZ": {
    action: "Napište recenzi produktu",
    message: "Podělte se o zkušenost s produktem",
    product: "Produkt",
  },
  "hu-HU": {
    action: "Írjon véleményt a termékről",
    message: "Ossza meg a termékkel kapcsolatos tapasztalatait",
    product: "Termék",
  },
  "ro-RO": {
    action: "Scrieți o recenzie pentru produs",
    message: "Împărtășiți experiența dumneavoastră cu produsul",
    product: "Produs",
  },
  "sk-SK": {
    action: "Napíšte recenziu produktu",
    message: "Podeľte sa o skúsenosť s produktom",
    product: "Produkt",
  },
} as const

const REVIEW_REQUEST_MESSAGE_KEYS = {
  "cs-CZ": ["message_cs", "message_cz", "cs", "cz"],
  "hu-HU": ["message_hu", "hu"],
  "ro-RO": ["message_ro", "ro"],
  "sk-SK": ["message_sk", "sk"],
} as const

export type ReviewRequestLocale = keyof typeof REVIEW_REQUEST_COPY

export function getReviewRequestCopy(locale: string) {
  return (
    REVIEW_REQUEST_COPY[locale as ReviewRequestLocale] ??
    REVIEW_REQUEST_COPY["sk-SK"]
  )
}

export function buildProductReviewRequestUrl({
  marketCode,
  storefrontUrl,
  token,
}: {
  marketCode: unknown
  storefrontUrl: string
  token: string
}) {
  return buildStorefrontPublicFlowUrl({
    marketCode,
    storefrontBaseUrl: storefrontUrl,
    target: { kind: "review", token },
  }).toString()
}

function getReviewRequestDelayMs(delayMinutes: number) {
  return delayMinutes * MINUTE_IN_MS
}

function toDate(value?: Date | string | null) {
  if (!value) {
    return
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function getEarliestDate(dates: Date[]) {
  return dates.reduce<Date | undefined>((earliest, date) => {
    if (!earliest || date.getTime() < earliest.getTime()) {
      return date
    }

    return earliest
  }, undefined)
}

export function getOrderPaidAt(order: ReviewRequestOrder) {
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

export function isPaidOrder(order: ReviewRequestOrder) {
  if (!order.email) {
    return false
  }

  if (order.status && SKIPPED_ORDER_STATUSES.has(order.status)) {
    return false
  }

  if (PAID_PAYMENT_STATUSES.has(order.payment_status ?? "")) {
    return true
  }

  return (order.payment_collections ?? []).some((collection) =>
    PAID_PAYMENT_STATUSES.has(collection.status ?? "")
  )
}

export function isReviewRequestReadyOrder(
  order: ReviewRequestOrder,
  delayMinutes: number,
  now = new Date()
) {
  if (!isPaidOrder(order)) {
    return false
  }

  const paidAt = getOrderPaidAt(order)
  if (!paidAt) {
    return false
  }

  return (
    now.getTime() - paidAt.getTime() >= getReviewRequestDelayMs(delayMinutes)
  )
}

export function getReviewRequestRunAt(
  order: ReviewRequestOrder,
  delayMinutes: number
) {
  const paidAt = getOrderPaidAt(order)
  if (!paidAt) {
    return
  }

  return new Date(paidAt.getTime() + getReviewRequestDelayMs(delayMinutes))
}

export async function getReviewRequestMessage(
  container: Record<string, unknown> | undefined,
  locale: string
) {
  if (container) {
    const config = await retrieveIntegrationConfig(
      container,
      INTEGRATION_CONFIG_NAMES.PRODUCT_REVIEW_REQUEST
    )

    if (config?.enabled) {
      const credentials = requireCredentialObject(config)
      const marketKeys =
        REVIEW_REQUEST_MESSAGE_KEYS[locale as ReviewRequestLocale] ??
        REVIEW_REQUEST_MESSAGE_KEYS["sk-SK"]
      const message = getCredentialString(credentials, ...marketKeys, "message")

      if (message) {
        return message
      }
    }
  }

  return getReviewRequestCopy(locale).message
}
