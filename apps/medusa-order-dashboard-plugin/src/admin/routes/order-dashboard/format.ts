import {
  ORDER_DASHBOARD_BUSINESS_STATUS_IDS,
  ORDER_DASHBOARD_CARRIER_KEYS,
  ORDER_DASHBOARD_TARGET_STATUSES,
} from "./types"
import type {
  OrderDashboardBusinessStatusId,
  OrderDashboardCarrierKey,
  OrderDashboardOrder,
  OrderDashboardTargetStatus,
} from "./types"

type TranslationFunction = (
  key: string,
  values?: Record<string, unknown>,
) => string

// Local copy for dashboard pre-checks; the backend mutation remains final.
const ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS = {
  archived: [],
  canceled: ["archived"],
  completed: ["archived"],
  draft: ["pending", "requires_action", "completed", "canceled", "archived"],
  pending: ["draft", "requires_action", "completed", "canceled"],
  requires_action: ["draft", "pending", "completed", "canceled"],
} as const satisfies Record<
  OrderDashboardTargetStatus,
  readonly OrderDashboardTargetStatus[]
>
const PAYMENT_PROVIDER_PREFIX_PATTERN = /^pp_/u
const PAYMENT_PROVIDER_TOKEN_SEPARATOR_PATTERN = /[_-]+/u
const ORDER_DASHBOARD_CARRIER_KEY_SET = new Set<string>(
  ORDER_DASHBOARD_CARRIER_KEYS,
)
const ORDER_DASHBOARD_BUSINESS_STATUS_ID_SET = new Set<string>(
  ORDER_DASHBOARD_BUSINESS_STATUS_IDS,
)
const ORDER_DASHBOARD_TARGET_STATUS_SET = new Set<string>(
  ORDER_DASHBOARD_TARGET_STATUSES,
)

export const isOrderDashboardCarrierKey = (
  value: unknown,
): value is OrderDashboardCarrierKey =>
  typeof value === "string" && ORDER_DASHBOARD_CARRIER_KEY_SET.has(value)

export const isOrderDashboardBusinessStatusId = (
  value: unknown,
): value is OrderDashboardBusinessStatusId =>
  typeof value === "string" && ORDER_DASHBOARD_BUSINESS_STATUS_ID_SET.has(value)

export const isOrderDashboardTargetStatus = (
  value: unknown,
): value is OrderDashboardTargetStatus =>
  typeof value === "string" && ORDER_DASHBOARD_TARGET_STATUS_SET.has(value)

const formatPaymentProviderToken = (token: string) => {
  switch (token.toLowerCase()) {
    case "qr": {
      return "QR"
    }
    case "gopay": {
      return "GoPay"
    }
    case "paypal": {
      return "PayPal"
    }
    case "skippay": {
      return "SkipPay"
    }
    default: {
      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`
    }
  }
}

const formatPaymentProviderId = (providerId: string): string | undefined => {
  const tokens = providerId
    .replace(PAYMENT_PROVIDER_PREFIX_PATTERN, "")
    .split(PAYMENT_PROVIDER_TOKEN_SEPARATOR_PATTERN)
    .filter((token) => token.length > 0)

  if (tokens.length === 0) {
    return undefined
  }

  const meaningfulTokens = tokens[0] === "paykit" ? tokens.slice(1) : tokens
  const lastToken = meaningfulTokens.at(-1)
  const labelTokens =
    meaningfulTokens[0] !== "system" &&
    meaningfulTokens.length > 1 &&
    lastToken === "default"
      ? meaningfulTokens.slice(0, -1)
      : meaningfulTokens

  return labelTokens.map(formatPaymentProviderToken).join(" ")
}

const isOrderDashboardTransitionSourceStatus = (
  value: string,
): value is keyof typeof ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS =>
  value in ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS

const formatTransitionStatusLabel = (status: string, t: TranslationFunction) =>
  isOrderDashboardTargetStatus(status)
    ? t(`targetStatus.${status}`)
    : status.replaceAll("_", " ")

const formatTransitionStatusSubject = (
  status: string,
  t: TranslationFunction,
) => {
  const formatted = formatTransitionStatusLabel(status, t)
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}

export const formatLocaleCode = (language?: string) =>
  language === undefined || language.length === 0
    ? undefined
    : language.replace("_", "-")

export const formatOrderDate = (
  date: string | null | undefined,
  locale?: string,
) => {
  if (date === null || date === undefined || date.length === 0) {
    return "-"
  }

  const timestamp = Date.parse(date)

  if (!Number.isFinite(timestamp)) {
    return "-"
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date(timestamp))
  } catch {
    return "-"
  }
}

export const formatOrderTotal = (
  order: OrderDashboardOrder,
  locale?: string,
) => {
  if (order.total === null || order.total === undefined) {
    return "-"
  }

  const total =
    typeof order.total === "string" ? Number(order.total) : order.total

  if (
    order.currency_code === null ||
    order.currency_code === undefined ||
    order.currency_code.length === 0 ||
    !Number.isFinite(total)
  ) {
    return String(order.total)
  }

  try {
    return new Intl.NumberFormat(locale, {
      currency: order.currency_code.toUpperCase(),
      style: "currency",
    }).format(total)
  } catch {
    return String(order.total)
  }
}

export const getCarrierLabel = (order: OrderDashboardOrder) =>
  order.carrier.shipping_method_name ?? order.carrier.label

export const formatPaymentMethodLabel = (value: string | null | undefined) => {
  if (value === null || value === undefined || value.length === 0) {
    return "-"
  }

  return formatPaymentProviderId(value) ?? value
}

export const getOrderDashboardTransitionBlockReason = (
  order: Pick<OrderDashboardOrder, "has_active_fulfillment" | "status">,
  targetStatus: OrderDashboardTargetStatus,
  t: TranslationFunction,
): string | undefined => {
  const currentStatus = order.status

  if (
    currentStatus === null ||
    currentStatus === undefined ||
    currentStatus.length === 0
  ) {
    return t("targetStatusBlocker.unknownStatus")
  }

  if (currentStatus === targetStatus) {
    return t("targetStatusBlocker.alreadyStatus", {
      status: formatTransitionStatusLabel(targetStatus, t),
    })
  }

  if (!isOrderDashboardTransitionSourceStatus(currentStatus)) {
    return t("targetStatusBlocker.unsupportedStatus", {
      status: formatTransitionStatusLabel(currentStatus, t),
    })
  }

  if (currentStatus === "archived") {
    return t("targetStatusBlocker.archivedCannotChange")
  }

  if (currentStatus === "canceled" && targetStatus !== "archived") {
    return t("targetStatusBlocker.canceledOnlyArchived")
  }

  if (currentStatus === "completed" && targetStatus === "canceled") {
    return t("targetStatusBlocker.completedCannotCanceled")
  }

  if (currentStatus === "completed" && targetStatus !== "archived") {
    return t("targetStatusBlocker.completedOnlyArchived")
  }

  if (targetStatus === "canceled" && order.has_active_fulfillment) {
    return t("targetStatusBlocker.activeFulfillmentCannotCanceled")
  }

  const allowedTargetStatuses: readonly OrderDashboardTargetStatus[] =
    ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS[currentStatus]

  if (!allowedTargetStatuses.includes(targetStatus)) {
    return t("targetStatusBlocker.targetNotAllowed", {
      currentStatus: formatTransitionStatusSubject(currentStatus, t),
      targetStatus: formatTransitionStatusLabel(targetStatus, t),
    })
  }

  return undefined
}
