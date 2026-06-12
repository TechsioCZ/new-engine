import {
  createLocalStorageValueStore,
  type StorageValueStore,
} from "@techsio/storefront-data/shared/storage-value-store"

export const CART_STORAGE_KEY = "herbatika_cart_id"

const baseCartStorage = createLocalStorageValueStore({
  key: CART_STORAGE_KEY,
})

const noop = () => null

type HerbatikaCartStorage = StorageValueStore & {
  getCartId: () => string | null
  setCartId: (cartId: string) => void
  clearCartId: () => void
}

export const cartStorage: HerbatikaCartStorage = {
  get() {
    return baseCartStorage.get()
  },
  set(cartId: string) {
    baseCartStorage.set(cartId)
  },
  clear() {
    baseCartStorage.clear()
  },
  subscribe(listener) {
    return baseCartStorage.subscribe?.(listener) ?? noop
  },
  getSnapshot() {
    return baseCartStorage.getSnapshot?.() ?? baseCartStorage.get()
  },
  getServerSnapshot() {
    return baseCartStorage.getServerSnapshot?.() ?? null
  },
  getCartId() {
    return baseCartStorage.getSnapshot?.() ?? baseCartStorage.get()
  },
  setCartId(cartId: string) {
    this.set(cartId)
  },
  clearCartId() {
    this.clear()
  },
}
