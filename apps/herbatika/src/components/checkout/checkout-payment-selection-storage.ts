"use client"

import { useSyncExternalStore } from "react"

const STORAGE_PREFIX = "herbatika.payment-provider"
const listeners = new Set<() => void>()

const emitPaymentProviderSelectionChange = () => {
  for (const listener of listeners) {
    listener()
  }
}

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
  emitPaymentProviderSelectionChange()
}

export function clearStoredPaymentProviderSelection(cartId?: string | null) {
  if (!cartId || typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(createStorageKey(cartId))
  emitPaymentProviderSelectionChange()
}

export function useStoredPaymentProviderSelection(cartId?: string | null) {
  return useSyncExternalStore(
    subscribeStoredPaymentProviderSelection,
    () => readStoredPaymentProviderSelection(cartId),
    () => null
  )
}

function subscribeStoredPaymentProviderSelection(listener: () => void) {
  listeners.add(listener)

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener)
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(STORAGE_PREFIX)) {
      listener()
    }
  }

  window.addEventListener("storage", handleStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", handleStorage)
  }
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
