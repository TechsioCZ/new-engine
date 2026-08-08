export const normalizePaymentReturnParam = (value: string | null) => {
  const normalized = value?.trim()
  return normalized !== undefined && normalized.length > 0 ? normalized : null
}

export const resolvePaymentReturnCancelled = (searchParams: {
  get: (name: string) => string | null
}) =>
  ["payment_cancelled", "cancelled", "canceled"].some((key) => {
    const value = searchParams.get(key)?.toLowerCase()
    return value === "true" || value === "1" || value === "yes"
  })

const isPaymentProviderAuthorizationFailure = (message: string) => {
  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes("not authorized with the provider") ||
    normalizedMessage.includes("was not authorized")
  )
}

export const resolvePaymentReturnFailureMessage = (
  message: string,
  authorizationFailureMessage: string,
) =>
  isPaymentProviderAuthorizationFailure(message)
    ? authorizationFailureMessage
    : message
