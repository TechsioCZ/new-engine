import { createLocalStorageCartStorage } from "../src/cart/browser-storage"

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

describe("createLocalStorageCartStorage", () => {
  const key = "test_cart_storage_key"

  it("notifies listeners for same-tab and storage-event updates", () => {
    const backingStorage = createMemoryStorage()
    const storage = createLocalStorageCartStorage({
      key,
      storage: backingStorage,
    })
    const listener = vi.fn()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.getCartId()).toBeNull()
    expect(storage.getSnapshot()).toBeNull()

    storage.setCartId("cart_1")
    expect(storage.getCartId()).toBe("cart_1")
    expect(listener).toHaveBeenCalledTimes(1)

    backingStorage.setItem(key, "cart_2")
    window.dispatchEvent(
      new StorageEvent("storage", {
        key,
        newValue: "cart_2",
      })
    )
    expect(listener).toHaveBeenCalledTimes(2)

    storage.clearCartId()
    expect(storage.getCartId()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
  })

  it("exposes the configured server snapshot", () => {
    const storage = createLocalStorageCartStorage({
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

    const storage = createLocalStorageCartStorage({
      key,
      storage: failingStorage,
    })
    const listener = vi.fn()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.getCartId()).toBeNull()
    expect(() => storage.setCartId("cart_1")).not.toThrow()
    expect(() => storage.clearCartId()).not.toThrow()
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })
})
