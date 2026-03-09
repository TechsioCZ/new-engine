import { createLocalStorageCartStorage } from "../src/cart/browser-storage"

describe("createLocalStorageCartStorage", () => {
  const key = "test_cart_storage_key"

  beforeEach(() => {
    window.localStorage.removeItem(key)
  })

  afterEach(() => {
    window.localStorage.removeItem(key)
  })

  it("notifies listeners for same-tab and storage-event updates", () => {
    const storage = createLocalStorageCartStorage({ key })
    const listener = vi.fn()
    const unsubscribe = storage.subscribe(listener)

    expect(storage.getCartId()).toBeNull()
    expect(storage.getSnapshot()).toBeNull()

    storage.setCartId("cart_1")
    expect(storage.getCartId()).toBe("cart_1")
    expect(listener).toHaveBeenCalledTimes(1)

    window.localStorage.setItem(key, "cart_2")
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
      serverSnapshot: "server_cart",
    })

    expect(storage.getServerSnapshot?.()).toBe("server_cart")
  })
})
