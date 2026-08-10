import type { IconType } from "@techsio/ui-kit/atoms/icon"

import { resolveCountryDisplayName } from "@/lib/forms/country-options"

const normalizeProviderValue = (providerId: string) =>
  providerId.toLowerCase().replaceAll(/[_-]+/gu, " ")

const isQrPaymentProviderValue = (normalizedValue: string) =>
  /qr manual|bank|wire/u.test(normalizedValue)

const isOnlineCardProviderValue = (normalizedValue: string) =>
  /card|stripe|google|apple|gopay/u.test(normalizedValue)

const isStripePaymentProviderValue = (normalizedValue: string) =>
  normalizedValue.includes("stripe")

type PaymentProviderKind =
  | "card"
  | "cash_on_delivery"
  | "gopay"
  | "other"
  | "paypal"
  | "qr"
  | "stripe"
  | "unknown"

interface PaymentDisplayTextKeys {
  descriptionKey?: string
  hintKey?: string
  hintValue?: string
  labelKey?: string
  providerName?: string
  summaryLabelKey?: string
}

const PAYMENT_DISPLAY_TEXT_KEYS = {
  card: {
    labelKey: "payment_provider_card",
    summaryLabelKey: "payment_summary_card_wallets",
  },
  cash_on_delivery: {
    labelKey: "payment_provider_cash_on_delivery",
    summaryLabelKey: "payment_provider_cash_on_delivery",
  },
  gopay: {
    descriptionKey: "payment_description_card_gateway",
    hintValue: "GoPay",
    labelKey: "payment_provider_card_gateway",
    providerName: "GoPay",
    summaryLabelKey: "payment_summary_card_gateway",
  },
  paypal: {
    providerName: "PayPal",
  },
  qr: {
    descriptionKey: "payment_description_qr",
    hintKey: "payment_hint_qr",
    labelKey: "payment_provider_qr",
    summaryLabelKey: "payment_provider_qr",
  },
  stripe: {
    descriptionKey: "payment_description_card_gateway",
    hintValue: "Stripe",
    labelKey: "payment_provider_card_gateway",
    providerName: "Stripe",
    summaryLabelKey: "payment_summary_card_gateway",
  },
  unknown: {
    labelKey: "payment_provider_unknown",
    summaryLabelKey: "payment_provider_unknown",
  },
} as const satisfies Record<
  Exclude<PaymentProviderKind, "other">,
  PaymentDisplayTextKeys
>

const resolvePaymentProviderKind = (
  providerId: string,
): PaymentProviderKind => {
  if (!providerId) {
    return "unknown"
  }

  const normalizedValue = normalizeProviderValue(providerId)
  if (isQrPaymentProviderValue(normalizedValue)) {
    return "qr"
  }

  if (normalizedValue.includes("gopay")) {
    return "gopay"
  }

  if (isStripePaymentProviderValue(normalizedValue)) {
    return "stripe"
  }

  if (normalizedValue.includes("paypal")) {
    return "paypal"
  }

  if (normalizedValue.includes("cod") || normalizedValue.includes("cash")) {
    return "cash_on_delivery"
  }

  if (isOnlineCardProviderValue(normalizedValue)) {
    return "card"
  }

  return "other"
}

export const resolvePaymentDisplayTextKeys = (
  providerId: string,
): PaymentDisplayTextKeys => {
  const providerKind = resolvePaymentProviderKind(providerId)
  return providerKind === "other" ? {} : PAYMENT_DISPLAY_TEXT_KEYS[providerKind]
}

export const formatProviderLabel = (providerId: string) =>
  providerId
    .replaceAll(/[_-]+/gu, " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export const resolvePaymentIcon = (providerId: string): IconType => {
  const providerKind = resolvePaymentProviderKind(providerId)

  if (providerKind === "qr") {
    return "token-icon-bank"
  }

  if (providerKind === "paypal") {
    return "token-icon-paypal"
  }

  if (
    providerKind === "card" ||
    providerKind === "gopay" ||
    providerKind === "stripe"
  ) {
    return "token-icon-credit-card"
  }

  if (providerKind === "cash_on_delivery") {
    return "token-icon-cash"
  }

  return "token-icon-wallet"
}

export const resolveShippingIcon = (option: {
  id?: string | null
  name?: string | null
}): IconType => {
  const normalizedValue =
    `${option.name ?? ""} ${option.id ?? ""}`.toLowerCase()

  if (/gls|packeta|box|pickup|predaj/u.test(normalizedValue)) {
    return "token-icon-box"
  }

  if (
    normalizedValue.includes("express") ||
    normalizedValue.includes("kurier") ||
    normalizedValue.includes("courier")
  ) {
    return "token-icon-truck-fast"
  }

  if (normalizedValue.includes("eko") || normalizedValue.includes("eco")) {
    return "token-icon-leaf"
  }

  return "token-icon-truck"
}

export const resolveCountryLabel = (countryCode: string, locale: string) =>
  resolveCountryDisplayName(countryCode, locale)
