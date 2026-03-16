import { createLocalStorageValueStore } from "../src/shared/browser-storage"

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe("createLocalStorageValueStore", () => {
  const key = "test_cart_storage_key"

  it("notifies listeners for same-tab and storage-event updates", () => {
    const backingStorage = createMemoryStorage()
    const storage = createLocalStorageValueStore({
      key,
      storage: backingStorage,
    })
    const listener = vi.fn()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.get()).toBeNull()
    expect(storage.getSnapshot()).toBeNull()

    storage.set("cart_1")
    expect(storage.get()).toBe("cart_1")
    expect(listener).toHaveBeenCalledTimes(1)

    backingStorage.setItem(key, "cart_2")
    const storageEvent = new Event("storage")
    Object.defineProperties(storageEvent, {
      key: { value: key },
      newValue: { value: "cart_2" },
      storageArea: { value: backingStorage },
    })
    window.dispatchEvent(storageEvent)
    expect(listener).toHaveBeenCalledTimes(2)

    const unrelatedStorageEvent = new Event("storage")
    Object.defineProperties(unrelatedStorageEvent, {
      key: { value: key },
      storageArea: { value: createMemoryStorage() },
    })
    window.dispatchEvent(unrelatedStorageEvent)
    expect(listener).toHaveBeenCalledTimes(2)

    storage.clear()
    expect(storage.get()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(3)

    backingStorage.setItem(key, "cart_3")
    const clearEvent = new Event("storage")
    Object.defineProperties(clearEvent, {
      key: { value: null },
      storageArea: { value: backingStorage },
    })
    window.dispatchEvent(clearEvent)
    expect(listener).toHaveBeenCalledTimes(4)
    unsubscribe()
  })

  it("exposes the configured server snapshot", () => {
    const storage = createLocalStorageValueStore({
      key,
      storage: createMemoryStorage(),
      serverSnapshot: "server_cart",
    })

    expect(storage.getServerSnapshot?.()).toBe("server_cart")
  })

  it("degrades gracefully when storage read/write/remove throws", () => {
    const failingStorage = {
      getItem: vi.fn(() => {
        throw new Error("read failed")
      }),
      setItem: vi.fn(() => {
        throw new Error("write failed")
      }),
      removeItem: vi.fn(() => {
        throw new Error("remove failed")
      }),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    } as unknown as Storage

    const storage = createLocalStorageValueStore({
      key,
      storage: failingStorage,
    })
    const listener = vi.fn()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.get()).toBeNull()
    expect(() => storage.set("cart_1")).not.toThrow()
    expect(() => storage.clear()).not.toThrow()
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })
})
