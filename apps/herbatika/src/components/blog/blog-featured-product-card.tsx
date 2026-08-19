"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { HerbatikaProductCard } from "@/components/herbatika-product-card"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { useAddProductToCartAction } from "@/lib/storefront/use-add-product-to-cart-action"

type BlogFeaturedProductCardProps = {
  product: HttpTypes.StoreProduct
  productPublicSlugsById: PublicEntitySlugMap
}

export function BlogFeaturedProductCard({
  product,
  productPublicSlugsById,
}: BlogFeaturedProductCardProps) {
  const region = useRegionContext()
  const addToCart = useAddProductToCartAction({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  })

  const handleAddToCart = async (selectedProduct: HttpTypes.StoreProduct) => {
    await addToCart.addProductToCart({
      product: selectedProduct,
      quantity: 1,
    })
  }

  return (
    <div className="space-y-250">
      <HerbatikaProductCard
        isAdding={Boolean(product.id) && addToCart.isProductAdding(product.id)}
        onAddToCart={handleAddToCart}
        product={product}
        publicSlug={productPublicSlugsById[product.id]}
      />
    </div>
  )
}
