import { getRecordValue, isRecord } from "@techsio/std/object"

const isRedirectUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}
const PAYMENT_URL_KEYS = [
  "payment_url",
  "paymentUrl",
  "checkout_url",
  "checkoutUrl",
  "gw_url",
  "gwUrl",
  "redirect_url",
  "redirectUrl",
  "url",
] as const

const resolvePaymentUrlFromRecord = (record: object): string | null => {
  for (const key of PAYMENT_URL_KEYS) {
    const value = getRecordValue(record, key)
    if (typeof value === "string" && isRedirectUrl(value)) {
      return value
    }
  }

  const data = getRecordValue(record, "data")
  if (isRecord(data)) {
    return resolvePaymentUrlFromRecord(data)
  }

  return null
}

const resolveSelectedSession = (sessions: unknown[]) =>
  sessions.find(
    (session) =>
      isRecord(session) &&
      (getRecordValue(session, "is_selected") === true ||
        getRecordValue(session, "selected") === true),
  ) ?? sessions[0]

const resolvePaymentUrlFromSessions = (
  paymentSessions: unknown,
): string | null => {
  if (!(Array.isArray(paymentSessions) && paymentSessions.length > 0)) {
    return null
  }

  const selectedSession = resolveSelectedSession(paymentSessions)
  return isRecord(selectedSession)
    ? resolvePaymentUrlFromRecord(selectedSession)
    : null
}

const resolvePaymentUrlFromPayments = (payments: unknown): string | null => {
  if (!Array.isArray(payments)) {
    return null
  }

  for (const payment of payments) {
    if (!isRecord(payment)) {
      continue
    }

    const paymentUrl = resolvePaymentUrlFromRecord(payment)
    if (paymentUrl !== null) {
      return paymentUrl
    }
  }

  return null
}

export const resolvePaymentRedirectUrl = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null
  }

  const directPaymentUrl = resolvePaymentUrlFromRecord(value)
  if (directPaymentUrl !== null) {
    return directPaymentUrl
  }

  const sessionPaymentUrl = resolvePaymentUrlFromSessions(
    getRecordValue(value, "payment_sessions"),
  )
  if (sessionPaymentUrl !== null) {
    return sessionPaymentUrl
  }

  return resolvePaymentUrlFromPayments(getRecordValue(value, "payments"))
}
