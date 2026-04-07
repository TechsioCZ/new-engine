import Medusa from "@medusajs/js-sdk"
import type { Config } from "@medusajs/js-sdk"
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "./browser-storage"
import { omitKeys } from "./object-utils"

export type MedusaClientConfig = Config

export type CreateMedusaSdkOptions = {
  disableAuthOnServer?: boolean
}

export type MedusaSdk = InstanceType<typeof Medusa>

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
  createFallback: (
    originalMethod: Storage[TMethodName]
  ) => Storage[TMethodName]
): (() => void) => {
  const storagePrototype = Object.getPrototypeOf(storage) as Storage
  const descriptor = Object.getOwnPropertyDescriptor(storagePrototype, methodName)
  const originalMethod = storagePrototype[methodName]

  Object.defineProperty(storagePrototype, methodName, {
    configurable: descriptor?.configurable ?? true,
    enumerable: descriptor?.enumerable ?? false,
    writable: descriptor?.writable ?? true,
    value: createFallback(originalMethod),
  })

  return () => {
    if (descriptor) {
      Object.defineProperty(storagePrototype, methodName, descriptor)
      return
    }

    Reflect.deleteProperty(storagePrototype, methodName)
  }
}

const withSafeLocalStorageMethods = <TValue>(callback: () => TValue): TValue => {
  if (typeof window === "undefined") {
    return callback()
  }

  let storage: Storage
  try {
    storage = window.localStorage
  } catch {
    return callback()
  }

  const restoreGetItem = patchStorageMethod(storage, "getItem", (original) => {
    return function getItem(this: Storage, key: string) {
      try {
        return original.call(this, key)
      } catch {
        return null
      }
    }
  })

  const restoreSetItem = patchStorageMethod(storage, "setItem", (original) => {
    return function setItem(this: Storage, key: string, value: string) {
      try {
        original.call(this, key, value)
      } catch {
        return undefined
      }
    }
  })

  const restoreRemoveItem = patchStorageMethod(
    storage,
    "removeItem",
    (original) => {
      return function removeItem(this: Storage, key: string) {
        try {
          original.call(this, key)
        } catch {
          return undefined
        }
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

  return patchClientLocaleStorage(withSafeLocalStorageMethods(() => new Medusa(config)))
}
