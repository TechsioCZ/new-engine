import type { Mock } from "vitest"
import { vi, describe, expect, it } from "vitest"

import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "../src/shared/local-storage"
import { createLocalStorageValueStore } from "../src/shared/storage-value-store"

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()

  return {
    clear: () => {
      store.clear()
    },
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, value)
    },
  }
}

const expectListenerCallCount = (listener: Mock<() => void>, count: number) => {
  expect(listener).toHaveBeenCalledTimes(count)
}

describe(createLocalStorageValueStore, () => {
  const key = "test_cart_storage_key"

  it("exposes safe localStorage helpers", () => {
    const storage = createMemoryStorage()

    expect(getLocalStorageItem(key, storage)).toBeNull()
    expect(setLocalStorageItem(key, "cart_1", storage)).toBeTruthy()
    expect(getLocalStorageItem(key, storage)).toBe("cart_1")
    expect(removeLocalStorageItem(key, storage)).toBeTruthy()
    expect(getLocalStorageItem(key, storage)).toBeNull()
  })

  it("notifies listeners for same-tab and storage-event updates", () => {
    const backingStorage = createMemoryStorage()
    const storage = createLocalStorageValueStore({
      key,
      storage: backingStorage,
    })
    const listener = vi.fn<() => void>()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.get()).toBeNull()
    expect(storage.getSnapshot()).toBeNull()

    storage.set("cart_1")
    expect(storage.get()).toBe("cart_1")
    expectListenerCallCount(listener, 1)

    backingStorage.setItem(key, "cart_2")
    const storageEvent = new Event("storage")
    Object.defineProperties(storageEvent, {
      key: { value: key },
      newValue: { value: "cart_2" },
      storageArea: { value: backingStorage },
    })
    window.dispatchEvent(storageEvent)
    expectListenerCallCount(listener, 2)

    const unrelatedStorageEvent = new Event("storage")
    Object.defineProperties(unrelatedStorageEvent, {
      key: { value: key },
      storageArea: { value: createMemoryStorage() },
    })
    window.dispatchEvent(unrelatedStorageEvent)
    expectListenerCallCount(listener, 2)

    storage.clear()
    expect(storage.get()).toBeNull()
    expectListenerCallCount(listener, 3)

    backingStorage.setItem(key, "cart_3")
    const clearEvent = new Event("storage")
    Object.defineProperties(clearEvent, {
      key: { value: null },
      storageArea: { value: backingStorage },
    })
    window.dispatchEvent(clearEvent)
    expectListenerCallCount(listener, 4)
    unsubscribe()
  })

  it("exposes the configured server snapshot", () => {
    const storage = createLocalStorageValueStore({
      key,
      serverSnapshot: "server_cart",
      storage: createMemoryStorage(),
    })

    expect(storage.getServerSnapshot?.()).toBe("server_cart")
  })

  it("degrades gracefully when storage read/write/remove throws", () => {
    const failingStorage = createMemoryStorage()
    vi.spyOn(failingStorage, "getItem").mockImplementation(() => {
      throw new Error("read failed")
    })
    vi.spyOn(failingStorage, "setItem").mockImplementation(() => {
      throw new Error("write failed")
    })
    vi.spyOn(failingStorage, "removeItem").mockImplementation(() => {
      throw new Error("remove failed")
    })

    const storage = createLocalStorageValueStore({
      key,
      storage: failingStorage,
    })
    const listener = vi.fn<() => void>()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.get()).toBeNull()
    expect(() => {
      storage.set("cart_1")
    }).not.toThrow()
    expect(() => {
      storage.clear()
    }).not.toThrow()
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })
})
