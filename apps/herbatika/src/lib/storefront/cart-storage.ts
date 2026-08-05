import { noop } from "@techsio/std/function"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/storage-value-store"
import type { StorageValueStore } from "@techsio/storefront-data/shared/storage-value-store"

const CART_STORAGE_KEY = "herbatika_cart_id"

const baseCartStorage = createLocalStorageValueStore({
  key: CART_STORAGE_KEY,
})

type HerbatikaCartStorage = StorageValueStore & {
  getCartId: () => string | null
  setCartId: (cartId: string) => void
  clearCartId: () => void
}

export const cartStorage: HerbatikaCartStorage = {
  clear() {
    baseCartStorage.clear()
  },
  clearCartId() {
    this.clear()
  },
  get() {
    return baseCartStorage.get()
  },
  getCartId() {
    return baseCartStorage.getSnapshot?.() ?? baseCartStorage.get()
  },
  getServerSnapshot() {
    return baseCartStorage.getServerSnapshot?.() ?? null
  },
  getSnapshot() {
    return baseCartStorage.getSnapshot?.() ?? baseCartStorage.get()
  },
  set(cartId: string) {
    baseCartStorage.set(cartId)
  },
  setCartId(cartId: string) {
    this.set(cartId)
  },
  subscribe(listener) {
    return baseCartStorage.subscribe?.(listener) ?? noop
  },
}
