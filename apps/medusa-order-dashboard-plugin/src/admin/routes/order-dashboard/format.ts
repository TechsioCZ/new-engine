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

const PAYMENT_STATUS_TRANSLATION_KEYS = {
  authorized: "authorized",
  awaiting: "awaiting",
  canceled: "canceled",
  captured: "captured",
  not_paid: "not_paid",
  partially_authorized: "partially_authorized",
  partially_captured: "partially_captured",
  partially_refunded: "partially_refunded",
  refunded: "refunded",
  requires_action: "requires_action",
} as const

const PAYMENT_METHOD_TRANSLATION_KEYS = {
  comgate: "comgate",
  gopay: "gopay",
  pp_paykit_comgate: "comgate",
  pp_paykit_gopay: "gopay",
  pp_paykit_stripe: "stripe",
  pp_qr_manual_default: "qr",
  pp_system_default: "manual",
  stripe: "stripe",
} as const

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

export function getCarrierLabel(
  order: OrderDashboardOrder,
  t?: TranslationFunction
) {
  const shippingMethodName = order.carrier.shipping_method_name?.trim()

  if (
    shippingMethodName &&
    !(
      order.carrier.value === "other" &&
      shippingMethodName.toLowerCase() === "other"
    )
  ) {
    return shippingMethodName
  }

  return t ? t(`carriers.${order.carrier.value}`) : order.carrier.label
}

export function formatOrderStatusLabel(
  value: string | null | undefined,
  t: TranslationFunction
) {
  if (!value) {
    return t("fallback.notAvailable")
  }

  const status = value.toLowerCase()

  return isOrderDashboardTargetStatus(status)
    ? t(`targetStatus.${status}`)
    : t("fallback.unknownOrderStatus", { status: value })
}

export function formatPaymentMethodLabel(
  value: string | null | undefined,
  t: TranslationFunction
) {
  const method = value?.trim()

  if (!(method && method.toLowerCase() !== "unknown")) {
    return t("fallback.notAvailable")
  }

  const translationKey = getPaymentMethodTranslationKey(method)

  return translationKey
    ? t(`paymentMethod.${translationKey}`)
    : t("fallback.unknownPaymentMethod", { method })
}

export function formatPaymentStatusLabel(
  value: string | null | undefined,
  t: TranslationFunction
) {
  if (!value) {
    return t("fallback.notAvailable")
  }

  const status = value.toLowerCase()

  return isKnownPaymentStatus(status)
    ? t(`paymentStatus.${PAYMENT_STATUS_TRANSLATION_KEYS[status]}`)
    : t("fallback.unknownPaymentStatus", { status: value })
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

function getPaymentMethodTranslationKey(value: string) {
  const normalized = value.toLowerCase()

  return isKnownPaymentMethod(normalized)
    ? PAYMENT_METHOD_TRANSLATION_KEYS[normalized]
    : undefined
}

function isKnownPaymentMethod(
  value: string
): value is keyof typeof PAYMENT_METHOD_TRANSLATION_KEYS {
  return Object.hasOwn(PAYMENT_METHOD_TRANSLATION_KEYS, value)
}

function isKnownPaymentStatus(
  value: string
): value is keyof typeof PAYMENT_STATUS_TRANSLATION_KEYS {
  return Object.hasOwn(PAYMENT_STATUS_TRANSLATION_KEYS, value)
}

function isOrderDashboardTransitionSourceStatus(
  value: string
): value is keyof typeof ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS {
  return value in ORDER_DASHBOARD_ALLOWED_STATUS_TRANSITIONS
}

function formatTransitionStatusLabel(status: string, t: TranslationFunction) {
  return isOrderDashboardTargetStatus(status)
    ? t(`targetStatus.${status}`)
    : t("fallback.unknownOrderStatus", { status })
}

function formatTransitionStatusSubject(status: string, t: TranslationFunction) {
  const formatted = formatTransitionStatusLabel(status, t)
  return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
}
