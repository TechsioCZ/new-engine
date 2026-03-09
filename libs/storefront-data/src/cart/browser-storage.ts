import type { CartStorageListener, ObservableCartStorage } from "./types"

export type CreateLocalStorageCartStorageOptions = {
  key: string
  storage?: Storage | null
  serverSnapshot?: string | null
}

const resolveStorage = (storage?: Storage | null): Storage | null => {
  if (storage) {
    return storage
  }

  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage
}

export function createLocalStorageCartStorage({
  key,
  storage,
  serverSnapshot = null,
}: CreateLocalStorageCartStorageOptions): ObservableCartStorage {
  const listeners = new Set<CartStorageListener>()

  const readCartId = (): string | null => resolveStorage(storage)?.getItem(key) ?? null

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

      if (resolvedStorage.getItem(key) === cartId) {
        return
      }

      resolvedStorage.setItem(key, cartId)
      notifyListeners()
    },
    clearCartId() {
      const resolvedStorage = resolveStorage(storage)
      if (!resolvedStorage) {
        return
      }

      if (resolvedStorage.getItem(key) === null) {
        return
      }

      resolvedStorage.removeItem(key)
      notifyListeners()
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
