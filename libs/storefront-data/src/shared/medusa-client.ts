import type { Config } from "@medusajs/js-sdk"
import Medusa from "@medusajs/js-sdk"
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "./local-storage"
import { omitKeys } from "./object-utils"

export type MedusaClientConfig = Config

export type CreateMedusaSdkOptions = {
  disableAuthOnServer?: boolean
}

export type MedusaSdk = InstanceType<typeof Medusa>

// Shared Medusa SDK bootstrap.
// Besides server-safe auth handling, this file also hardens locale persistence
// because Medusa touches `medusa_locale` in localStorage during client creation
// and locale reads/writes without exposing a clean public override.
const LOCALE_STORAGE_KEY = "medusa_locale"

type MedusaClientWithMutableLocale = {
  locale_: string
  setLocale: (locale: string) => void
}

const patchStorageMethod = <
  TMethodName extends "getItem" | "setItem" | "removeItem",
>(
  storage: Storage,
  methodName: TMethodName,
  createFallback: (originalMethod: Storage[TMethodName]) => Storage[TMethodName]
): (() => void) => {
  const storagePrototype = Object.getPrototypeOf(storage) as Storage
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(
    storagePrototype,
    methodName
  )
  const ownDescriptor = Object.getOwnPropertyDescriptor(storage, methodName)
  const originalMethod = storage[methodName] ?? storagePrototype[methodName]
  const fallbackMethod = createFallback(originalMethod)

  try {
    Object.defineProperty(storage, methodName, {
      configurable: true,
      enumerable: ownDescriptor?.enumerable ?? false,
      writable: true,
      value: fallbackMethod,
    })
  } catch {
    Object.defineProperty(storagePrototype, methodName, {
      configurable: prototypeDescriptor?.configurable ?? true,
      enumerable: prototypeDescriptor?.enumerable ?? false,
      writable: prototypeDescriptor?.writable ?? true,
      value: fallbackMethod,
    })
  }

  return () => {
    if (ownDescriptor) {
      Object.defineProperty(storage, methodName, ownDescriptor)
      return
    }

    Reflect.deleteProperty(storage, methodName)

    if (prototypeDescriptor) {
      Object.defineProperty(storagePrototype, methodName, prototypeDescriptor)
    }
  }
}

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys()).at(index) ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  } as Storage
}

const createSafeStorage = (storage: Storage | null | undefined): Storage => {
  if (!storage) {
    return createMemoryStorage()
  }

  const safeStorage = Object.create(storage) as Storage

  Object.defineProperties(safeStorage, {
    getItem: {
      configurable: true,
      value: (key: string) => {
        try {
          return storage.getItem(key)
        } catch {
          return null
        }
      },
    },
    setItem: {
      configurable: true,
      value: (key: string, value: string) => {
        try {
          storage.setItem(key, value)
        } catch {
          return
        }
      },
    },
    removeItem: {
      configurable: true,
      value: (key: string) => {
        try {
          storage.removeItem(key)
        } catch {
          return
        }
      },
    },
  })

  return safeStorage
}

// During SDK construction, Medusa may read/write locale from localStorage.
// Some browsers expose localStorage but still throw on access, so we
// temporarily patch those methods just for the constructor call.
const withSafeLocalStorageMethods = <TValue>(
  callback: () => TValue
): TValue => {
  if (typeof window === "undefined") {
    return callback()
  }

  let storage: Storage | null | undefined
  try {
    storage = window.localStorage
  } catch {
    storage = null
  }

  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "localStorage"
  )
  let replacedWindowLocalStorage = false
  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: localStorageDescriptor?.enumerable ?? true,
      value: createSafeStorage(storage),
    })
    replacedWindowLocalStorage = true
  } catch {
    // Fall back to method patching for environments where window.localStorage
    // cannot be replaced but its methods can still be wrapped safely.
  }

  if (replacedWindowLocalStorage) {
    try {
      return callback()
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, "localStorage", localStorageDescriptor)
      } else {
        Reflect.deleteProperty(window, "localStorage")
      }
    }
  }

  if (!storage) {
    return callback()
  }

  const restoreGetItem = patchStorageMethod(
    storage,
    "getItem",
    (original) =>
      function getItem(this: Storage, key: string) {
        try {
          return original.call(this, key)
        } catch {
          return null
        }
      }
  )

  const restoreSetItem = patchStorageMethod(
    storage,
    "setItem",
    (original) =>
      function setItem(this: Storage, key: string, value: string) {
        try {
          original.call(this, key, value)
        } catch {
          return
        }
      }
  )

  const restoreRemoveItem = patchStorageMethod(
    storage,
    "removeItem",
    (original) =>
      function removeItem(this: Storage, key: string) {
        try {
          original.call(this, key)
        } catch {
          return
        }
      }
  )

  try {
    return callback()
  } finally {
    restoreRemoveItem()
    restoreSetItem()
    restoreGetItem()
  }
}

// After construction, keep locale access on the client side behind the same
// safe localStorage seam so blocked storage degrades instead of crashing.
const patchClientLocaleStorage = (sdk: MedusaSdk): MedusaSdk => {
  if (typeof window === "undefined") {
    return sdk
  }

  const client = sdk.client as unknown as MedusaClientWithMutableLocale

  Object.defineProperty(client, "locale", {
    configurable: true,
    enumerable: true,
    get() {
      return getLocalStorageItem(LOCALE_STORAGE_KEY) ?? client.locale_ ?? ""
    },
  })

  client.setLocale = (locale: string) => {
    if (locale) {
      setLocalStorageItem(LOCALE_STORAGE_KEY, locale)
    } else {
      removeLocalStorageItem(LOCALE_STORAGE_KEY)
    }
    client.locale_ = locale
  }

  return sdk
}

export function createMedusaSdk(
  config: MedusaClientConfig,
  options: CreateMedusaSdkOptions = {}
): MedusaSdk {
  const { disableAuthOnServer = true } = options
  if (disableAuthOnServer && typeof window === "undefined" && config.auth) {
    return new Medusa(omitKeys(config, ["auth"]))
  }

  return patchClientLocaleStorage(
    withSafeLocalStorageMethods(() => new Medusa(config))
  )
}
