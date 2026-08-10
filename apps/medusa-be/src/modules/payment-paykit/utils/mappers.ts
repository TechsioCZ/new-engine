import type {
  BigNumberValue,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { paymentSchema } from "@paykit-sdk/core"

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
]

const paykitCompatibleStatusSchema = z.enum([
  "pending",
  "processing",
  "requires_action",
  "requires_capture",
  "succeeded",
  "canceled",
  "failed",
  "requires_more",
  "authorized",
  "captured",
  "paid",
  "cancelled",
  "error",
])

const compatibleWebhookPaymentSchema = z.object({
  amount: z.union([z.number(), z.string()]).optional(),
  amount_paid: z.union([z.number(), z.string()]).optional(),
  currency: z.string().nullable().optional(),
  currency_code: z.string().nullable().optional(),
  id: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  state: paykitCompatibleStatusSchema.optional(),
  status: paykitCompatibleStatusSchema.optional(),
})

const hasPaykitPaymentMarker = (payment: PaykitPayment): boolean =>
  typeof payment.id === "string" ||
  PAYKIT_PAYMENT_MARKER_FIELDS.some((field) => field in payment)

const parseWebhookPayment = (value: unknown): PaykitPayment | null => {
  const compatibilityResult = compatibleWebhookPaymentSchema.safeParse(value)
  if (
    compatibilityResult.success &&
    hasPaykitPaymentMarker(compatibilityResult.data)
  ) {
    return compatibilityResult.data
  }

  const paymentResult = paymentSchema.partial().safeParse(value)
  return paymentResult.success && hasPaykitPaymentMarker(paymentResult.data)
    ? paymentResult.data
    : null
}

const toBigNumberValue = (value: unknown): BigNumberValue | undefined => {
  if (typeof value === "number" || typeof value === "string") {
    return value
  }

  if (typeof value !== "object" || value === null) {
    return undefined
  }

  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      return undefined
    }

    const result = z.number().safeParse(JSON.parse(serialized))
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
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

export const toPaykitPaymentData = (payment: PaykitPayment) => {
  const paymentUrl = getPaymentUrl(payment)

  return {
    ...payment,
    id: payment.id,
    ...(paymentUrl === undefined ? {} : { payment_url: paymentUrl }),
  }
}

export const toPaykitRefundData = (refund: PaykitRefund) => ({ ...refund })

const getWebhookPayment = (event: PaykitWebhookEvent): PaykitPayment | null => {
  if (event.payment && hasPaykitPaymentMarker(event.payment)) {
    return event.payment
  }

  const directPayment = parseWebhookPayment(event.data)
  if (directPayment) {
    return directPayment
  }

  if (typeof event.data !== "object" || event.data === null) {
    return null
  }

  return (
    parseWebhookPayment(Reflect.get(event.data, "object")) ??
    parseWebhookPayment(Reflect.get(event.data, "payment"))
  )
}

const getWebhookSessionId = (
  event: PaykitWebhookEvent,
  payment: PaykitPayment,
): string | undefined => {
  if (typeof payment.metadata?.["session_id"] === "string") {
    return payment.metadata["session_id"]
  }

  if (typeof event.metadata?.["session_id"] === "string") {
    return event.metadata["session_id"]
  }

  return undefined
}

const normalizeWebhookAmount = (
  amount: unknown,
): BigNumberValue | undefined => {
  const result = z
    .object({ value: z.union([z.number(), z.string()]) })
    .safeParse(amount)
  return result.success ? result.data.value : toBigNumberValue(amount)
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
