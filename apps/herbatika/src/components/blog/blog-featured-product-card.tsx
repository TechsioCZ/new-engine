"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { HerbatikaProductCard } from "@/components/herbatika-product-card"
import { useAppToast } from "@/hooks/use-app-toast"
import {
  ADD_PRODUCT_TO_CART_SUCCESS_MESSAGE,
  resolveAddProductToCartErrorMessage,
  useAddProductToCart,
} from "@/lib/storefront/use-add-product-to-cart"

type BlogFeaturedProductCardProps = {
  product: HttpTypes.StoreProduct
}

export function BlogFeaturedProductCard({
  product,
}: BlogFeaturedProductCardProps) {
  const region = useRegionContext()
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  })
  const toast = useAppToast()

  const handleAddToCart = async (selectedProduct: HttpTypes.StoreProduct) => {
    try {
      await addToCart.addProductToCart({
        product: selectedProduct,
        quantity: 1,
      })
      toast.success({ title: ADD_PRODUCT_TO_CART_SUCCESS_MESSAGE })
    } catch (error) {
      toast.error({ title: resolveAddProductToCartErrorMessage(error) })
    }
  }

  return (
    <div className="space-y-250">
      <HerbatikaProductCard
        isAdding={Boolean(product.id) && addToCart.isProductAdding(product.id)}
        onAddToCart={handleAddToCart}
        product={product}
      />
    </div>
  )
}
