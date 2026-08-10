import { Store } from "@tanstack/react-store"

import type { Cart } from "@/hooks/use-cart"

interface OrderState {
  completedOrder: Cart | null
}

// Create the order store
const orderStore = new Store<OrderState>({
  completedOrder: null,
})

// Helper functions
export const orderHelpers = {
  // Clear saved order data
  clearCompletedOrder: () => {
    orderStore.setState(() => ({
      completedOrder: null,
    }))
  },

  // Get order data - returns current cart or saved completed order
  getOrderData: (currentCart: Cart | null): Cart | null => {
    const { state } = orderStore

    // If we have a completed order saved, use that
    if (state.completedOrder !== null) {
      return state.completedOrder
    }
    // Otherwise use current cart
    return currentCart
  },

  // Save current cart data before clearing
  saveCompletedOrder: (cart: Cart) => {
    orderStore.setState(() => ({
      completedOrder: cart,
    }))
  },
}
