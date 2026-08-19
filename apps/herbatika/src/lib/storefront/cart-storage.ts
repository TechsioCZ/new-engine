import {
  createLocalStorageValueStore,
  type StorageValueStore,
} from "@techsio/storefront-data/shared/storage-value-store"
import { syncCartSession } from "./checkout-access"
import { runDetachedPromise } from "./detached-promise"

export const CART_STORAGE_KEY = "herbatika_cart_id"

const baseCartStorage = createLocalStorageValueStore({
  key: CART_STORAGE_KEY,
})

const noop = () => null
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export const buildCartCookie = (
  cartId: string | null,
  secure: boolean
): string =>
  [
    `${CART_STORAGE_KEY}=${cartId === null ? "" : encodeURIComponent(cartId)}`,
    "Path=/",
    "SameSite=Lax",
    cartId === null ? "Max-Age=0" : `Max-Age=${CART_COOKIE_MAX_AGE_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ")

const mirrorCartCookie = (cartId: string | null) => {
  if (typeof document === "undefined") {
    return
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
  // biome-ignore lint/suspicious/noDocumentCookie: this non-authoritative SSR lookup hint must mirror the local-storage cart selection.
  document.cookie = buildCartCookie(cartId, secure)
}

const syncSelectedCartSession = (cartId: string) => {
  if (typeof window === "undefined") {
    return
  }

  runDetachedPromise(syncCartSession(cartId), noop)
}

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
    mirrorCartCookie(cartId)
    syncSelectedCartSession(cartId)
  },
  clear() {
    baseCartStorage.clear()
    mirrorCartCookie(null)
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
