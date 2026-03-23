import {
  createLocalStorageValueStore,
  type StorageValueStore,
} from "@techsio/storefront-data/shared/browser-storage";

export const CART_STORAGE_KEY = "herbatika_cart_id";
export const CART_ID_CHANGED_EVENT = "herbatika:cart-id-changed";

type CartIdChangedDetail = {
  cartId: string | null;
};

const baseCartStorage = createLocalStorageValueStore({
  key: CART_STORAGE_KEY,
});

const emitCartIdChanged = (cartId: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CartIdChangedDetail>(CART_ID_CHANGED_EVENT, {
      detail: { cartId },
    }),
  );
};

export const getStoredCartId = () => {
  return baseCartStorage.getSnapshot?.() ?? baseCartStorage.get();
};

type HerbatikaCartStorage = StorageValueStore & {
  getCartId: () => string | null;
  setCartId: (cartId: string) => void;
  clearCartId: () => void;
};

export const cartStorage: HerbatikaCartStorage = {
  get() {
    return baseCartStorage.get();
  },
  set(cartId: string) {
    baseCartStorage.set(cartId);
    emitCartIdChanged(baseCartStorage.get());
  },
  clear() {
    baseCartStorage.clear();
    emitCartIdChanged(baseCartStorage.get());
  },
  subscribe(listener) {
    return baseCartStorage.subscribe?.(listener) ?? (() => {});
  },
  getSnapshot() {
    return baseCartStorage.getSnapshot?.() ?? baseCartStorage.get();
  },
  getServerSnapshot() {
    return baseCartStorage.getServerSnapshot?.() ?? null;
  },
  getCartId() {
    return getStoredCartId();
  },
  setCartId(cartId: string) {
    this.set(cartId);
  },
  clearCartId() {
    this.clear();
  },
};
