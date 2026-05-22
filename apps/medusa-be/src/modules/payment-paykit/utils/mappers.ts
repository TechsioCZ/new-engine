import type {
  BigNumberInput,
  BigNumberValue,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  BigNumber,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type { PaykitPayment, PaykitWebhookEvent } from "../types"

type PaykitWebhookMappingOptions = {
  normalizeAmount?: (
    amount: BigNumberValue | undefined,
    payment: PaykitPayment,
    event: PaykitWebhookEvent
  ) => BigNumberValue | undefined
}

const MEDUSA_PROCESSABLE_WEBHOOK_ACTIONS = new Set<PaymentActions>([
  PaymentActions.AUTHORIZED,
  PaymentActions.SUCCESSFUL,
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPaykitPayment = (value: unknown): value is PaykitPayment =>
  isRecord(value) &&
  (typeof value.id === "string" ||
    "amount" in value ||
    "amount_paid" in value ||
    "status" in value ||
    "state" in value)

const isBigNumberInput = (value: unknown): value is BigNumberInput =>
  value instanceof BigNumber ||
  (isRecord(value) &&
    "value" in value &&
    (typeof value.value === "number" || typeof value.value === "string")) ||
  (isRecord(value) &&
    typeof value.toJSON === "function" &&
    typeof value.valueOf === "function")

const toBigNumberValue = (value: unknown): BigNumberValue | undefined => {
  if (typeof value === "number" || typeof value === "string") {
    return value
  }

  if (!isBigNumberInput(value)) {
    return
  }

  try {
    return new BigNumber(value)
  } catch {
    return
  }
}

export const mapPaykitStatusToMedusa = (
  status: unknown
): PaymentSessionStatus => {
  switch (status) {
    case "requires_action":
    case "requires_more":
      return PaymentSessionStatus.REQUIRES_MORE
    case "requires_capture":
    case "authorized":
      return PaymentSessionStatus.AUTHORIZED
    case "succeeded":
    case "captured":
    case "paid":
      return PaymentSessionStatus.CAPTURED
    case "canceled":
    case "cancelled":
      return PaymentSessionStatus.CANCELED
    case "failed":
    case "error":
      return PaymentSessionStatus.ERROR
    default:
      return PaymentSessionStatus.PENDING
  }
}

export const getPaymentStatusValue = (payment: PaykitPayment): unknown =>
  payment.status ?? payment.state

export const getPaymentUrl = (payment: PaykitPayment): string | undefined =>
  payment.payment_url ??
  payment.paymentUrl ??
  payment.checkout_url ??
  payment.gw_url ??
  payment.url ??
  undefined

export const toPaykitPaymentData = (
  payment: PaykitPayment
): Record<string, unknown> => {
  const paymentUrl = getPaymentUrl(payment)

  return {
    ...payment,
    id: payment.id,
    ...(paymentUrl ? { payment_url: paymentUrl } : {}),
  }
}

const getWebhookPayment = (event: PaykitWebhookEvent): PaykitPayment | null => {
  const data = event.data

  if (isPaykitPayment(event.payment)) {
    return event.payment
  }

  if (isPaykitPayment(data)) {
    return data
  }

  if (isRecord(data) && isPaykitPayment(data.object)) {
    return data.object
  }

  if (isRecord(data) && isPaykitPayment(data.payment)) {
    return data.payment
  }

  return null
}

const getWebhookSessionId = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment
): string | undefined => {
  if (
    isRecord(payment.metadata) &&
    typeof payment.metadata.session_id === "string"
  ) {
    return payment.metadata.session_id
  }

  if (
    isRecord(event.metadata) &&
    typeof event.metadata.session_id === "string"
  ) {
    return event.metadata.session_id
  }

  return
}

const getWebhookAmount = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment
): BigNumberValue | undefined =>
  normalizeWebhookAmount(event.amount ?? payment.amount ?? payment.amount_paid)

const normalizeWebhookAmount = (
  amount: unknown
): BigNumberValue | undefined => {
  if (
    typeof amount === "object" &&
    amount !== null &&
    "value" in amount &&
    (typeof amount.value === "number" || typeof amount.value === "string")
  ) {
    return amount.value
  }

  return toBigNumberValue(amount)
}

const mapPaykitWebhookAction = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment
): PaymentActions => {
  if (event.is_raw) {
    return PaymentActions.NOT_SUPPORTED
  }

  const status = getPaymentStatusValue(payment)

  if (event.type === "payment.canceled" || status === "canceled") {
    return PaymentActions.CANCELED
  }

  if (
    event.type === "payment.failed" ||
    status === "failed" ||
    status === "error"
  ) {
    return PaymentActions.FAILED
  }

  if (event.type === "payment.succeeded") {
    return PaymentActions.SUCCESSFUL
  }

  const medusaStatus = mapPaykitStatusToMedusa(status)

  switch (event.type) {
    case "invoice.generated":
      return PaymentActions.SUCCESSFUL
    case "payment.created":
    case "payment.updated":
      switch (medusaStatus) {
        case PaymentSessionStatus.REQUIRES_MORE:
          return PaymentActions.REQUIRES_MORE
        case PaymentSessionStatus.AUTHORIZED:
          return PaymentActions.AUTHORIZED
        case PaymentSessionStatus.CAPTURED:
          return PaymentActions.SUCCESSFUL
        case PaymentSessionStatus.CANCELED:
          return PaymentActions.CANCELED
        case PaymentSessionStatus.ERROR:
          return PaymentActions.FAILED
        default:
          return PaymentActions.PENDING
      }
    default:
      return PaymentActions.NOT_SUPPORTED
  }
}

export const mapPaykitWebhookEvent = (
  event?: PaykitWebhookEvent,
  options: PaykitWebhookMappingOptions = {}
): WebhookActionResult => {
  if (!event) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  const payment = getWebhookPayment(event)

  if (!payment) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  const sessionId = getWebhookSessionId(event, payment)
  const rawAmount = getWebhookAmount(event, payment)
  const amount = options.normalizeAmount
    ? options.normalizeAmount(rawAmount, payment, event)
    : rawAmount
  const action = mapPaykitWebhookAction(event, payment)
  const canProcessInMedusa =
    MEDUSA_PROCESSABLE_WEBHOOK_ACTIONS.has(action) && sessionId

  if (
    event.type === "invoice.generated" &&
    (!sessionId || amount === undefined)
  ) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  if (!canProcessInMedusa || amount === undefined) {
    return { action }
  }

  return {
    action,
    data: {
      session_id: sessionId,
      amount,
    },
  }
}
