export type StorageValueStoreListener = () => void

export type StorageValueStore = {
  get: () => string | null
  set: (value: string) => void
  clear: () => void
  subscribe?: (listener: StorageValueStoreListener) => () => void
  getSnapshot?: () => string | null
  getServerSnapshot?: () => string | null
}

export type ObservableStorageValueStore = StorageValueStore & {
  subscribe: (listener: StorageValueStoreListener) => () => void
  getSnapshot: () => string | null
}

export type CreateLocalStorageValueStoreOptions = {
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

export function createLocalStorageValueStore({
  key,
  storage,
  serverSnapshot = null,
}: CreateLocalStorageValueStoreOptions): ObservableStorageValueStore {
  const listeners = new Set<StorageValueStoreListener>()

  const readValue = (): string | null =>
    getStorageItem(resolveStorage(storage), key) ?? null

  const notifyListeners = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    get: readValue,
    set(value: string) {
      const resolvedStorage = resolveStorage(storage)
      if (!resolvedStorage) {
        return
      }

      if (getStorageItem(resolvedStorage, key) === value) {
        return
      }

      if (setStorageItem(resolvedStorage, key, value)) {
        notifyListeners()
      }
    },
    clear() {
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
    subscribe(listener: StorageValueStoreListener) {
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
    getSnapshot: readValue,
    getServerSnapshot: () => serverSnapshot,
  }
}
