import {
  ORDER_DASHBOARD_BUSINESS_STATUS_IDS,
  ORDER_DASHBOARD_CARRIER_KEYS,
  ORDER_DASHBOARD_TARGET_STATUSES,
  type OrderDashboardBusinessStatusId,
  type OrderDashboardCarrierKey,
  type OrderDashboardOrder,
  type OrderDashboardTargetStatus,
} from "./types"

type TranslationFunction = (
  key: string,
  options?: Record<string, unknown>
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

export function formatLocaleCode(language?: string) {
  return language ? language.replace("_", "-") : undefined
}

export function formatOrderDate(
  date: string | null | undefined,
  locale?: string
) {
  if (!date) {
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

export function formatOrderTotal(order: OrderDashboardOrder, locale?: string) {
  if (order.total === null || order.total === undefined) {
    return "-"
  }

  const total =
    typeof order.total === "string" ? Number(order.total) : order.total

  if (!(order.currency_code && Number.isFinite(total))) {
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

export function getCarrierLabel(order: OrderDashboardOrder) {
  return order.carrier.shipping_method_name ?? order.carrier.label
}

export function formatPaymentMethodLabel(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  return formatPaymentProviderId(value) ?? value
}

export function getOrderDashboardTransitionBlockReason(
  order: Pick<OrderDashboardOrder, "has_active_fulfillment" | "status">,
  targetStatus: OrderDashboardTargetStatus,
  t: TranslationFunction
) {
  const currentStatus = order.status

  if (!currentStatus) {
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

  return
}

export function isOrderDashboardCarrierKey(
  value: unknown
): value is OrderDashboardCarrierKey {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_CARRIER_KEYS.includes(value as OrderDashboardCarrierKey)
  )
}

export function isOrderDashboardBusinessStatusId(
  value: unknown
): value is OrderDashboardBusinessStatusId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_BUSINESS_STATUS_IDS.includes(
      value as OrderDashboardBusinessStatusId
    )
  )
}

export function isOrderDashboardTargetStatus(
  value: unknown
): value is OrderDashboardTargetStatus {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_TARGET_STATUSES.includes(
      value as OrderDashboardTargetStatus
    )
  )
}

function formatPaymentProviderId(providerId: string) {
  const tokens = providerId
    .replace(PAYMENT_PROVIDER_PREFIX_PATTERN, "")
    .split(PAYMENT_PROVIDER_TOKEN_SEPARATOR_PATTERN)
    .filter(Boolean)

  if (!tokens.length) {
    return
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

function formatPaymentProviderToken(token: string) {
  switch (token.toLowerCase()) {
    case "qr":
      return "QR"
    case "gopay":
      return "GoPay"
    case "paypal":
      return "PayPal"
    case "skippay":
      return "SkipPay"
    default:
      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`
  }
}

function isOrderDashboardTransitionSourceStatus(
  value: string
): value is keyof typeof ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS {
  return value in ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS
}

function formatTransitionStatusLabel(status: string, t: TranslationFunction) {
  return isOrderDashboardTargetStatus(status)
    ? t(`targetStatus.${status}`)
    : status.replace(/_/g, " ")
}

function formatTransitionStatusSubject(status: string, t: TranslationFunction) {
  const formatted = formatTransitionStatusLabel(status, t)
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}
