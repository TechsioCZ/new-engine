import type { CartStorage } from "@techsio/storefront-data";

export const CART_STORAGE_KEY = "herbatika_cart_id";
export const CART_ID_CHANGED_EVENT = "herbatika:cart-id-changed";

type CartIdChangedDetail = {
  cartId: string | null;
};

const isBrowser = () => typeof window !== "undefined";
const emitCartIdChanged = (cartId: string | null) => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CartIdChangedDetail>(CART_ID_CHANGED_EVENT, {
      detail: { cartId },
    }),
  );
};

export const getStoredCartId = () => {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(CART_STORAGE_KEY);
};

export const cartStorage: CartStorage = {
  getCartId() {
    return getStoredCartId();
  },
  setCartId(cartId: string) {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, cartId);
    emitCartIdChanged(cartId);
  },
  clearCartId() {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.removeItem(CART_STORAGE_KEY);
    emitCartIdChanged(null);
  },
};
