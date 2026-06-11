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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const resolvePaymentUrlFromRecord = (
  record: Record<string, unknown>
): string | null => {
  for (const key of PAYMENT_URL_KEYS) {
    const value = record[key]
    if (typeof value === "string" && isRedirectUrl(value)) {
      return value
    }
  }

  const data = record.data
  if (isObject(data)) {
    return resolvePaymentUrlFromRecord(data)
  }

  return null
}

const resolveSelectedSession = (sessions: unknown[]) =>
  sessions.find(
    (session) =>
      isObject(session) &&
      (session.is_selected === true || session.selected === true)
  ) ?? sessions[0]

const resolvePaymentUrlFromSessions = (
  paymentSessions: unknown
): string | null => {
  if (!(Array.isArray(paymentSessions) && paymentSessions.length > 0)) {
    return null
  }

  const selectedSession = resolveSelectedSession(paymentSessions)
  return isObject(selectedSession)
    ? resolvePaymentUrlFromRecord(selectedSession)
    : null
}

const resolvePaymentUrlFromPayments = (payments: unknown): string | null => {
  if (!Array.isArray(payments)) {
    return null
  }

  for (const payment of payments) {
    if (!isObject(payment)) {
      continue
    }

    const paymentUrl = resolvePaymentUrlFromRecord(payment)
    if (paymentUrl) {
      return paymentUrl
    }
  }

  return null
}

export const resolvePaymentRedirectUrl = (value: unknown): string | null => {
  if (!isObject(value)) {
    return null
  }

  const directPaymentUrl = resolvePaymentUrlFromRecord(value)
  if (directPaymentUrl) {
    return directPaymentUrl
  }

  const sessionPaymentUrl = resolvePaymentUrlFromSessions(
    value.payment_sessions
  )
  if (sessionPaymentUrl) {
    return sessionPaymentUrl
  }

  return resolvePaymentUrlFromPayments(value.payments)
}

function isRedirectUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}
