import {
  getLocalStorageItem,
  removeLocalStorageItem,
  resolveLocalStorage,
  setLocalStorageItem,
} from "./local-storage"

type ObservableStorageValueStore = StorageValueStore & {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => string | null
}

export type StorageValueStore = {
  get: () => string | null
  set: (value: string) => void
  clear: () => void
  subscribe?: (listener: () => void) => () => void
  getSnapshot?: () => string | null
  getServerSnapshot?: () => string | null
}

export function createLocalStorageValueStore({
  key,
  storage,
  serverSnapshot = null,
}: {
  key: string
  storage?: Storage | null
  serverSnapshot?: string | null
}): ObservableStorageValueStore {
  const listeners = new Set<() => void>()

  const readValue = (): string | null => getLocalStorageItem(key, storage)

  const notifyListeners = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    get: readValue,
    set(value: string) {
      const resolvedStorage = resolveLocalStorage(storage)
      if (!resolvedStorage) {
        return
      }

      if (getLocalStorageItem(key, resolvedStorage) === value) {
        return
      }

      if (setLocalStorageItem(key, value, resolvedStorage)) {
        notifyListeners()
      }
    },
    clear() {
      const resolvedStorage = resolveLocalStorage(storage)
      if (!resolvedStorage) {
        return
      }

      if (getLocalStorageItem(key, resolvedStorage) === null) {
        return
      }

      if (removeLocalStorageItem(key, resolvedStorage)) {
        notifyListeners()
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener)

      if (typeof window === "undefined") {
        return () => {
          listeners.delete(listener)
        }
      }

      const resolvedStorage = resolveLocalStorage(storage)
      const handleStorage = (event: StorageEvent) => {
        if (
          resolvedStorage &&
          event.storageArea &&
          event.storageArea !== resolvedStorage
        ) {
          return
        }
        if (event.key === key || event.key === null) {
          listener()
        }
      }

      window.addEventListener("storage", handleStorage)

      return () => {
        listeners.delete(listener)
        window.removeEventListener("storage", handleStorage)
      }
    },
    getSnapshot: readValue,
    getServerSnapshot: () => serverSnapshot,
  }
}
