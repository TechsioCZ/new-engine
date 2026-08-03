type ResolveCheckoutControllerStateInput<TItem> = {
  cartItems?: TItem[] | null | undefined
  itemCount: number
  cartFetching: boolean
  regionsLoading: boolean
  regionsFetching: boolean
  updateCartAddressPending: boolean
  updateCartPending: boolean
  settingShipping: boolean
  initiatingPayment: boolean
  completeCheckoutPending: boolean
  selectedShippingMethodId?: string
}

export const resolveCheckoutControllerState = <TItem>({
  cartItems: unresolvedCartItems,
  itemCount,
  cartFetching,
  regionsLoading,
  regionsFetching,
  updateCartAddressPending,
  updateCartPending,
  settingShipping,
  initiatingPayment,
  completeCheckoutPending,
  selectedShippingMethodId,
}: ResolveCheckoutControllerStateInput<TItem>) => {
  const cartItems = unresolvedCartItems ?? []

  return {
    cartItems,
    hasItems: itemCount > 0 || cartItems.length > 0,
    hasShipping: Boolean(selectedShippingMethodId),
    isBusy:
      cartFetching ||
      regionsLoading ||
      regionsFetching ||
      updateCartAddressPending ||
      updateCartPending ||
      settingShipping ||
      initiatingPayment ||
      completeCheckoutPending,
  }
}
