"use client"

import { useAppToast } from "@/hooks/use-app-toast"
import {
  type AddProductToCartInput,
  resolveAddProductToCartErrorMessage,
  useAddProductToCart,
  type UseAddProductToCartProps,
} from "./use-add-product-to-cart"
import { useCartStorefrontTexts } from "./use-cart-storefront-texts"

export function useAddProductToCartAction(
  props: UseAddProductToCartProps
) {
  const cartTexts = useCartStorefrontTexts()
  const toast = useAppToast()
  const {
    addProductToCart: mutateAddProductToCart,
    ...addToCartState
  } = useAddProductToCart(props)

  const addProductToCart = async (input: AddProductToCartInput) => {
    try {
      await mutateAddProductToCart(input)
      toast.success({ title: cartTexts.addedToCart })
    } catch (error) {
      toast.error({
        title: resolveAddProductToCartErrorMessage(error, cartTexts.failed),
      })
    }
  }

  return {
    ...addToCartState,
    addProductToCart,
  }
}
