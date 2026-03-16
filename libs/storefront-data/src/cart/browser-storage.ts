import type { CartStorageListener, ObservableCartStorage } from "./types"

export type CreateLocalStorageCartStorageOptions = {
  key: string
  storage?: Storage | null
  serverSnapshot?: string | null
}

const resolveStorage = (storage?: Storage | null): Storage | null => {
  try {
    if (storage) {
      return storage
    }

    if (typeof window === "undefined") {
      return null
    }

    return window.localStorage
  } catch {
    return null
  }
}

const getStorageItem = (
  storage: Storage | null,
  key: string
): string | null => {
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const setStorageItem = (
  storage: Storage | null,
  key: string,
  value: string
): boolean => {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const removeStorageItem = (storage: Storage | null, key: string): boolean => {
  if (!storage) {
    return false
  }

  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function createLocalStorageCartStorage({
  key,
  storage,
  serverSnapshot = null,
}: CreateLocalStorageCartStorageOptions): ObservableCartStorage {
  const listeners = new Set<CartStorageListener>()

  const readCartId = (): string | null => getStorageItem(resolveStorage(storage), key)

  const notifyListeners = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    getCartId: readCartId,
    setCartId(cartId: string) {
      const resolvedStorage = resolveStorage(storage)
      if (!resolvedStorage) {
        return
      }

      if (getStorageItem(resolvedStorage, key) === cartId) {
        return
      }

      if (setStorageItem(resolvedStorage, key, cartId)) {
        notifyListeners()
      }
    },
    clearCartId() {
      const resolvedStorage = resolveStorage(storage)
      if (!resolvedStorage) {
        return
      }

      if (getStorageItem(resolvedStorage, key) === null) {
        return
      }

      if (removeStorageItem(resolvedStorage, key)) {
        notifyListeners()
      }
    },
    subscribe(listener: CartStorageListener) {
      listeners.add(listener)

      if (typeof window === "undefined") {
        return () => {
          listeners.delete(listener)
        }
      }

      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) {
          listener()
        }
      }

      window.addEventListener("storage", handleStorage)

      return () => {
        listeners.delete(listener)
        window.removeEventListener("storage", handleStorage)
      }
    },
    getSnapshot: readCartId,
    getServerSnapshot: () => serverSnapshot,
  }
}
