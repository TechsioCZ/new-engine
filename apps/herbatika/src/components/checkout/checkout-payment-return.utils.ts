export const resolvePaymentReturnFailureMessage = (message: string) =>
  isPaymentProviderAuthorizationFailure(message)
    ? "Platba nebola dokončená alebo bola zrušená."
    : message

const isPaymentProviderAuthorizationFailure = (message: string) => {
  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes("not authorized with the provider") ||
    normalizedMessage.includes("was not authorized")
  )
}

export const normalizePaymentReturnSearchParam = (value: string | null) => {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

export const resolvePaymentCancelled = (searchParams: {
  get: (name: string) => string | null
}) =>
  ["payment_cancelled", "cancelled", "canceled"].some((key) => {
    const value = searchParams.get(key)?.toLowerCase()
    return value === "true" || value === "1" || value === "yes"
  })
