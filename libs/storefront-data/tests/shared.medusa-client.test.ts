import { describe, expect, it } from "vitest"
import { createMedusaSdk } from "../src/shared/medusa-client"

const patchBlockedLocalStorage = () => {
  const originalGetItem = Storage.prototype.getItem
  const originalSetItem = Storage.prototype.setItem
  const originalRemoveItem = Storage.prototype.removeItem

  Storage.prototype.getItem = function (key: string) {
    if (this === window.localStorage) {
      throw new Error(`blocked getItem:${key}`)
    }
    return originalGetItem.call(this, key)
  }

  Storage.prototype.setItem = function (key: string, value: string) {
    if (this === window.localStorage) {
      throw new Error(`blocked setItem:${key}`)
    }
    return originalSetItem.call(this, key, value)
  }

  Storage.prototype.removeItem = function (key: string) {
    if (this === window.localStorage) {
      throw new Error(`blocked removeItem:${key}`)
    }
    return originalRemoveItem.call(this, key)
  }

  return () => {
    Storage.prototype.getItem = originalGetItem
    Storage.prototype.setItem = originalSetItem
    Storage.prototype.removeItem = originalRemoveItem
  }
}

describe("createMedusaSdk degraded localStorage", () => {
  it("constructs the sdk without crashing when localStorage access throws", () => {
    const restore = patchBlockedLocalStorage()

    try {
      expect(() =>
        createMedusaSdk({
          baseUrl: "https://example.com",
        })
      ).not.toThrow()
    } finally {
      restore()
    }
  })

  it("keeps locale reads and writes in memory when localStorage is unavailable", () => {
    const restore = patchBlockedLocalStorage()

    try {
      const sdk = createMedusaSdk({
        baseUrl: "https://example.com",
      })

      expect(() => sdk.setLocale("sk")).not.toThrow()
      expect(sdk.getLocale()).toBe("sk")
    } finally {
      restore()
    }
  })
})
