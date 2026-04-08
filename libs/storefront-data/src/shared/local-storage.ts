export const resolveLocalStorage = (
  storage?: Storage | null
): Storage | null => {
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

export const getLocalStorageItem = (
  key: string,
  storage?: Storage | null
): string | null => getStorageItem(resolveLocalStorage(storage), key) ?? null

export const setLocalStorageItem = (
  key: string,
  value: string,
  storage?: Storage | null
): boolean => setStorageItem(resolveLocalStorage(storage), key, value)

export const removeLocalStorageItem = (
  key: string,
  storage?: Storage | null
): boolean => removeStorageItem(resolveLocalStorage(storage), key)
