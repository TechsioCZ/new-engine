import type {
  BigNumberValue,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import type { PaykitPayment, PaykitWebhookEvent } from "./types"

type PaykitWebhookMappingOptions = {
  normalizeAmount?: (
    amount: BigNumberValue | undefined,
    payment: PaykitPayment,
    event: PaykitWebhookEvent
  ) => BigNumberValue | undefined
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

const getWebhookPayment = (event: PaykitWebhookEvent): PaykitPayment => {
  const data = event.data

  if (event.payment) {
    return event.payment
  }

  if (data && "object" in data && data.object) {
    return data.object as PaykitPayment
  }

  if (data && "payment" in data && data.payment) {
    return data.payment as PaykitPayment
  }

  return (data ?? ({} as Record<string, unknown>)) as PaykitPayment
}

const getWebhookSessionId = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment
): string | undefined =>
  (payment.metadata?.session_id as string | undefined) ??
  (event.metadata?.session_id as string | undefined)

const getWebhookAmount = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment
): BigNumberValue | undefined =>
  normalizeWebhookAmount(event.amount ?? payment.amount ?? payment.amount_paid)

const normalizeWebhookAmount = (
  amount: unknown
): BigNumberValue | undefined => {
  if (
    typeof amount === "number" ||
    typeof amount === "string" ||
    (typeof amount === "object" &&
      amount !== null &&
      "toJSON" in amount &&
      "valueOf" in amount)
  ) {
    return amount as BigNumberValue
  }

  if (
    typeof amount === "object" &&
    amount !== null &&
    "value" in amount &&
    (typeof amount.value === "number" || typeof amount.value === "string")
  ) {
    return amount.value
  }

  return
}

const mapPaykitWebhookAction = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment
): PaymentActions => {
  const status = getPaymentStatusValue(payment)

  if (event.type === "payment.canceled" || status === "canceled") {
    return PaymentActions.CANCELED
  }

  if (status === "failed" || status === "error") {
    return PaymentActions.FAILED
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
  const sessionId = getWebhookSessionId(event, payment)
  const rawAmount = getWebhookAmount(event, payment)
  const amount = options.normalizeAmount
    ? options.normalizeAmount(rawAmount, payment, event)
    : rawAmount
  const action = mapPaykitWebhookAction(event, payment)

  if (
    event.type === "invoice.generated" &&
    (!sessionId || amount === undefined)
  ) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  if (!sessionId || amount === undefined) {
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
