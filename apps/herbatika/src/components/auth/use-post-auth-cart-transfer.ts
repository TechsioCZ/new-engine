"use client"

import {
  cartReadQueryOptions,
  useCart,
  useTransferCart,
} from "@/lib/storefront/cart"
import { cartStorage } from "@/lib/storefront/cart-storage"

interface UsePostAuthCartTransferInput {
  countryCode?: string
  failureMessage: string
  regionId?: string
}

export interface PostAuthCartTransfer {
  cartQuery: ReturnType<typeof useCart>
  runPostAuthCartTransfer: () => Promise<string | null>
  transferCartIfAvailable: () => Promise<void>
  transferCartMutation: ReturnType<typeof useTransferCart>
}

export const usePostAuthCartTransfer = ({
  countryCode,
  failureMessage,
  regionId,
}: UsePostAuthCartTransferInput): PostAuthCartTransfer => {
  const transferCartMutation = useTransferCart()
  const cartQuery = useCart(
    {
      autoCreate: false,
      ...(regionId === undefined ? {} : { region_id: regionId }),
      ...(countryCode === undefined ? {} : { country_code: countryCode }),
      enabled: regionId !== undefined,
    },
    {
      queryOptions: cartReadQueryOptions,
    },
  )

  const transferCartIfAvailable = async () => {
    const activeCartId = cartQuery.cart?.id
    if (activeCartId === undefined || activeCartId === "") {
      return
    }

    const transferredCart = await transferCartMutation.mutateAsync({
      cartId: activeCartId,
    })
    if (
      transferredCart?.id !== null &&
      transferredCart?.id !== undefined &&
      transferredCart.id !== ""
    ) {
      cartStorage.setCartId(transferredCart.id)
    }
  }

  const runPostAuthCartTransfer = async () => {
    if (cartQuery.cart?.id === undefined || cartQuery.cart.id === "") {
      return null
    }

    try {
      await transferCartIfAvailable()
      return null
    } catch {
      return failureMessage
    }
  }

  return {
    cartQuery,
    runPostAuthCartTransfer,
    transferCartIfAvailable,
    transferCartMutation,
  }
}
