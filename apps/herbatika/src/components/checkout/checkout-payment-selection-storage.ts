"use client"

const STORAGE_PREFIX = "herbatika.payment-provider"

export function readStoredPaymentProviderSelection(cartId?: string | null) {
  if (!cartId || typeof window === "undefined") {
    return null
  }

  try {
    const providerId = window.sessionStorage.getItem(createStorageKey(cartId))
    return normalizeProviderId(providerId)
  } catch {
    return null
  }
}

export function writeStoredPaymentProviderSelection({
  cartId,
  providerId,
}: {
  cartId?: string | null
  providerId: string
}) {
  if (!cartId || typeof window === "undefined") {
    return
  }

  const normalizedProviderId = normalizeProviderId(providerId)
  if (!normalizedProviderId) {
    clearStoredPaymentProviderSelection(cartId)
    return
  }

  window.sessionStorage.setItem(createStorageKey(cartId), normalizedProviderId)
}

export function clearStoredPaymentProviderSelection(cartId?: string | null) {
  if (!cartId || typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(createStorageKey(cartId))
}

function createStorageKey(cartId: string) {
  return `${STORAGE_PREFIX}.${cartId}`
}

function normalizeProviderId(providerId?: string | null) {
  const normalizedProviderId = providerId?.trim()
  return normalizedProviderId && normalizedProviderId.length > 0
    ? normalizedProviderId
    : null
}
