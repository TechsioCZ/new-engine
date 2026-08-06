import type { Config } from "@medusajs/js-sdk"
import Medusa from "@medusajs/js-sdk"
import { omitKeys } from "@techsio/std/object"

import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "./local-storage"

export type MedusaClientConfig = Config

export interface CreateMedusaSdkOptions {
  disableAuthOnServer?: boolean
}

export type MedusaSdk = InstanceType<typeof Medusa>

// Shared Medusa SDK bootstrap.
// Besides server-safe auth handling, this file also hardens locale persistence
// because Medusa touches `medusa_locale` in localStorage during client creation
// and locale reads/writes without exposing a clean public override.
const LOCALE_STORAGE_KEY = "medusa_locale"

const patchStorageMethod = <
  TMethodName extends "getItem" | "setItem" | "removeItem",
>(
  storage: Storage,
  methodName: TMethodName,
  fallbackMethod: Storage[TMethodName],
): (() => void) => {
  const storagePrototype = Reflect.getPrototypeOf(storage) ?? storage
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(
    storagePrototype,
    methodName,
  )
  const ownDescriptor = Object.getOwnPropertyDescriptor(storage, methodName)
  try {
    Object.defineProperty(storage, methodName, {
      configurable: true,
      enumerable: ownDescriptor?.enumerable ?? false,
      value: fallbackMethod,
      writable: true,
    })
  } catch {
    Object.defineProperty(storagePrototype, methodName, {
      configurable: prototypeDescriptor?.configurable ?? true,
      enumerable: prototypeDescriptor?.enumerable ?? false,
      value: fallbackMethod,
      writable: prototypeDescriptor?.writable ?? true,
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

const createSafeStorage = (storage: Storage): Storage => ({
  clear: () => {
    try {
      storage.clear()
    } catch {
      // Blocked storage degrades to an empty in-memory view.
    }
  },
  getItem: (key) => {
    try {
      return storage.getItem(key)
    } catch {
      return null
    }
  },
  key: (index) => {
    try {
      return storage.key(index)
    } catch {
      return null
    }
  },
  get length() {
    try {
      return storage.length
    } catch {
      return 0
    }
  },
  removeItem: (key) => {
    try {
      storage.removeItem(key)
    } catch {
      // Blocked storage degrades to an empty in-memory view.
    }
  },
  setItem: (key, value) => {
    try {
      storage.setItem(key, value)
    } catch {
      // Blocked storage degrades to an empty in-memory view.
    }
  },
})

// During SDK construction, Medusa may read/write locale from localStorage.
// Some browsers expose localStorage but still throw on access, so we
// temporarily patch those methods just for the constructor call.
const createMedusaWithSafeLocalStorageMethods = (
  config: MedusaClientConfig,
): MedusaSdk => {
  if (typeof window === "undefined") {
    return new Medusa(config)
  }

  let storage: Storage
  try {
    storage = window.localStorage
  } catch {
    return new Medusa(config)
  }

  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "localStorage",
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
      return new Medusa(config)
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, "localStorage", localStorageDescriptor)
      } else {
        Reflect.deleteProperty(window, "localStorage")
      }
    }
  }

  const originalGetItem = storage.getItem.bind(storage)
  const restoreGetItem = patchStorageMethod(storage, "getItem", (key) => {
    try {
      return originalGetItem(key)
    } catch {
      return null
    }
  })

  const originalSetItem = storage.setItem.bind(storage)
  const restoreSetItem = patchStorageMethod(
    storage,
    "setItem",
    (key, value) => {
      try {
        originalSetItem(key, value)
      } catch {
        // Blocked storage writes are intentionally ignored.
      }
    },
  )

  const originalRemoveItem = storage.removeItem.bind(storage)
  const restoreRemoveItem = patchStorageMethod(storage, "removeItem", (key) => {
    try {
      originalRemoveItem(key)
    } catch {
      // Blocked storage removals are intentionally ignored.
    }
  })

  try {
    return new Medusa(config)
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

  Object.defineProperty(sdk.client, "locale", {
    configurable: true,
    enumerable: true,
    get() {
      const locale: unknown = Reflect.get(sdk.client, "locale_")
      return (
        getLocalStorageItem(LOCALE_STORAGE_KEY) ??
        (typeof locale === "string" ? locale : "")
      )
    },
  })

  sdk.client.setLocale = (locale: string) => {
    if (locale === "") {
      removeLocalStorageItem(LOCALE_STORAGE_KEY)
    } else {
      setLocalStorageItem(LOCALE_STORAGE_KEY, locale)
    }
    Reflect.set(sdk.client, "locale_", locale)
  }

  return sdk
}

export const createMedusaSdk = (
  config: MedusaClientConfig,
  options: CreateMedusaSdkOptions = {},
): MedusaSdk => {
  const { disableAuthOnServer = true } = options
  if (
    disableAuthOnServer &&
    typeof window === "undefined" &&
    config.auth !== undefined
  ) {
    return new Medusa(omitKeys(config, ["auth"]))
  }

  return patchClientLocaleStorage(
    createMedusaWithSafeLocalStorageMethods(config),
  )
}
