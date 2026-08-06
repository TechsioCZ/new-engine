import type {
  BigNumberValue,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import type { PaykitPayment, PaykitRefund, PaykitWebhookEvent } from "../types"

interface PaykitWebhookMappingOptions {
  normalizeAmount?: (
    amount: BigNumberValue | undefined,
    payment: PaykitPayment,
    event: PaykitWebhookEvent,
  ) => BigNumberValue | undefined
}

const MEDUSA_PROCESSABLE_WEBHOOK_ACTIONS = new Set<PaymentActions>([
  PaymentActions.AUTHORIZED,
  PaymentActions.SUCCESSFUL,
])

const PAYKIT_PAYMENT_MARKER_FIELDS = [
  "amount",
  "amount_paid",
  "status",
  "state",
] as const

const isPaykitPayment = (value: unknown): value is PaykitPayment =>
  isRecord(value) &&
  (typeof value["id"] === "string" ||
    PAYKIT_PAYMENT_MARKER_FIELDS.some((field) => field in value))

interface SerializableBigNumber {
  toJSON: () => unknown
  valueOf: () => unknown
}

const isSerializableBigNumber = (
  value: unknown,
): value is SerializableBigNumber =>
  isRecord(value) &&
  typeof value["toJSON"] === "function" &&
  typeof value.valueOf === "function"

const toBigNumberValue = (value: unknown): BigNumberValue | undefined => {
  if (typeof value === "number" || typeof value === "string") {
    return value
  }

  if (!isSerializableBigNumber(value)) {
    return undefined
  }

  const serialized = value.toJSON()
  return typeof serialized === "number" ? serialized : undefined
}

export const mapPaykitStatusToMedusa = (
  status: unknown,
): PaymentSessionStatus => {
  switch (status) {
    case "requires_action":
    case "requires_more": {
      return PaymentSessionStatus.REQUIRES_MORE
    }
    case "requires_capture":
    case "authorized": {
      return PaymentSessionStatus.AUTHORIZED
    }
    case "succeeded":
    case "captured":
    case "paid": {
      return PaymentSessionStatus.CAPTURED
    }
    case "canceled":
    case "cancelled": {
      return PaymentSessionStatus.CANCELED
    }
    case "failed":
    case "error": {
      return PaymentSessionStatus.ERROR
    }
    default: {
      return PaymentSessionStatus.PENDING
    }
  }
}

export const getPaymentStatusValue = (payment: PaykitPayment): unknown =>
  payment.status ?? payment.state

const getPaymentUrl = (payment: PaykitPayment): string | undefined =>
  [
    payment.payment_url,
    payment.paymentUrl,
    payment.checkout_url,
    payment.gw_url,
    payment.url,
  ].find((value): value is string => typeof value === "string")

export const toPaykitPaymentData = (
  payment: PaykitPayment,
): Record<string, unknown> => {
  const paymentUrl = getPaymentUrl(payment)

  return {
    ...payment,
    id: payment.id,
    ...(paymentUrl === undefined ? {} : { payment_url: paymentUrl }),
  }
}

export const toPaykitRefundData = (
  refund: PaykitRefund,
): Record<string, unknown> => ({ ...refund })

const getWebhookPayment = (event: PaykitWebhookEvent): PaykitPayment | null => {
  const { data } = event

  if (isPaykitPayment(event.payment)) {
    return event.payment
  }

  if (isPaykitPayment(data)) {
    return data
  }

  if (isRecord(data) && isPaykitPayment(data["object"])) {
    return data["object"]
  }

  if (isRecord(data) && isPaykitPayment(data["payment"])) {
    return data["payment"]
  }

  return null
}

const getWebhookSessionId = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment,
): string | undefined => {
  if (
    isRecord(payment.metadata) &&
    typeof payment.metadata["session_id"] === "string"
  ) {
    return payment.metadata["session_id"]
  }

  if (
    isRecord(event.metadata) &&
    typeof event.metadata["session_id"] === "string"
  ) {
    return event.metadata["session_id"]
  }

  return undefined
}

const normalizeWebhookAmount = (
  amount: unknown,
): BigNumberValue | undefined => {
  if (isRecord(amount)) {
    const { value } = amount
    if (typeof value === "number" || typeof value === "string") {
      return value
    }
  }

  return toBigNumberValue(amount)
}

const getWebhookAmount = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment,
): BigNumberValue | undefined =>
  normalizeWebhookAmount(event.amount ?? payment.amount ?? payment.amount_paid)

const PAYMENT_ACTION_BY_SESSION_STATUS = {
  [PaymentSessionStatus.AUTHORIZED]: PaymentActions.AUTHORIZED,
  [PaymentSessionStatus.CANCELED]: PaymentActions.CANCELED,
  [PaymentSessionStatus.CAPTURED]: PaymentActions.SUCCESSFUL,
  [PaymentSessionStatus.ERROR]: PaymentActions.FAILED,
  [PaymentSessionStatus.PENDING]: PaymentActions.PENDING,
  [PaymentSessionStatus.PENDING_AUTHORIZATION]: PaymentActions.PENDING,
  [PaymentSessionStatus.REQUIRES_MORE]: PaymentActions.REQUIRES_MORE,
} satisfies Record<PaymentSessionStatus, PaymentActions>

const mapPaykitWebhookAction = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment,
): PaymentActions => {
  if (event.is_raw === true) {
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

  if (event.type === "invoice.generated") {
    return PaymentActions.SUCCESSFUL
  }

  if (event.type === "payment.created" || event.type === "payment.updated") {
    return PAYMENT_ACTION_BY_SESSION_STATUS[medusaStatus]
  }

  return PaymentActions.NOT_SUPPORTED
}

export const mapPaykitWebhookEvent = (
  event?: PaykitWebhookEvent,
  options: PaykitWebhookMappingOptions = {},
): WebhookActionResult => {
  if (event === undefined) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  const payment = getWebhookPayment(event)

  if (payment === null) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  const sessionId = getWebhookSessionId(event, payment)
  const rawAmount = getWebhookAmount(event, payment)
  const amount =
    options.normalizeAmount === undefined
      ? rawAmount
      : options.normalizeAmount(rawAmount, payment, event)
  const action = mapPaykitWebhookAction(event, payment)
  const canProcessInMedusa =
    MEDUSA_PROCESSABLE_WEBHOOK_ACTIONS.has(action) &&
    sessionId !== undefined &&
    sessionId.length > 0

  if (
    event.type === "invoice.generated" &&
    (sessionId === undefined || sessionId.length === 0 || amount === undefined)
  ) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  if (!canProcessInMedusa || amount === undefined) {
    return { action }
  }

  return {
    action,
    data: {
      amount,
      session_id: sessionId,
    },
  }
}
