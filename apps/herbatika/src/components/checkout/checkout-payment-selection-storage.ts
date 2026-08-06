"use client"

import { useSyncExternalStore } from "react"

const STORAGE_PREFIX = "herbatika.payment-provider"
const listeners = new Set<() => void>()

const emitPaymentProviderSelectionChange = () => {
  for (const listener of listeners) {
    listener()
  }
}

const createStorageKey = (cartId: string) => `${STORAGE_PREFIX}.${cartId}`

export const clearStoredPaymentProviderSelection = (cartId?: string | null) => {
  if (
    cartId === undefined ||
    cartId === null ||
    cartId.length === 0 ||
    typeof window === "undefined"
  ) {
    return
  }

  window.sessionStorage.removeItem(createStorageKey(cartId))
  emitPaymentProviderSelectionChange()
}

const subscribeStoredPaymentProviderSelection = (listener: () => void) => {
  listeners.add(listener)

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener)
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(STORAGE_PREFIX) === true) {
      listener()
    }
  }

  window.addEventListener("storage", handleStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", handleStorage)
  }
}

const normalizeProviderId = (providerId?: string | null) => {
  const normalizedProviderId = providerId?.trim()
  return normalizedProviderId !== undefined && normalizedProviderId.length > 0
    ? normalizedProviderId
    : null
}

const readStoredPaymentProviderSelection = (cartId?: string | null) => {
  if (
    cartId === undefined ||
    cartId === null ||
    cartId.length === 0 ||
    typeof window === "undefined"
  ) {
    return null
  }

  try {
    const providerId = window.sessionStorage.getItem(createStorageKey(cartId))
    return normalizeProviderId(providerId)
  } catch {
    return null
  }
}

export const writeStoredPaymentProviderSelection = ({
  cartId,
  providerId,
}: {
  cartId?: string | null
  providerId: string
}) => {
  if (
    cartId === undefined ||
    cartId === null ||
    cartId.length === 0 ||
    typeof window === "undefined"
  ) {
    return
  }

  const normalizedProviderId = normalizeProviderId(providerId)
  if (normalizedProviderId === null) {
    clearStoredPaymentProviderSelection(cartId)
    return
  }

  window.sessionStorage.setItem(createStorageKey(cartId), normalizedProviderId)
  emitPaymentProviderSelectionChange()
}

export const useStoredPaymentProviderSelection = (cartId?: string | null) =>
  useSyncExternalStore(
    subscribeStoredPaymentProviderSelection,
    () => readStoredPaymentProviderSelection(cartId),
    () => null,
  )
