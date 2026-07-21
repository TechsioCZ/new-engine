"use client"

import { useAppToast } from "@/hooks/use-app-toast"
import { useTranslations } from "next-intl"
import {
  type AddProductToCartInput,
  resolveAddProductToCartErrorMessage,
  useAddProductToCart,
  type UseAddProductToCartProps,
} from "./use-add-product-to-cart"

export function useAddProductToCartAction(
  props: UseAddProductToCartProps
) {
  const t = useTranslations("cart")
  const toast = useAppToast()
  const {
    addProductToCart: mutateAddProductToCart,
    ...addToCartState
  } = useAddProductToCart(props)

  const addProductToCart = async (input: AddProductToCartInput) => {
    try {
      await mutateAddProductToCart(input)
      toast.success({ title: t("added_to_cart") })
    } catch (error) {
      toast.error({
        title: resolveAddProductToCartErrorMessage(error, t("failed")),
      })
    }
  }

  return {
    ...addToCartState,
    addProductToCart,
  }
}
