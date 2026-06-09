"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useState } from "react";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";
import { SupportingText } from "@/components/text/supporting-text";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";

type BlogFeaturedProductCardProps = {
  product: HttpTypes.StoreProduct;
};

export function BlogFeaturedProductCard({
  product,
}: BlogFeaturedProductCardProps) {
  const region = useRegionContext();
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });

  const handleAddToCart = async (selectedProduct: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    try {
      await addToCart.addProductToCart({
        product: selectedProduct,
        quantity: 1,
      });
    } catch (error) {
      setAddToCartError(
        error instanceof Error ? error.message : "Pridanie do košíka zlyhalo.",
      );
    }
  };

  return (
    <div className="space-y-250">
      <HerbatikaProductCard
        isAdding={Boolean(product.id) && addToCart.isProductAdding(product.id)}
        onAddToCart={handleAddToCart}
        product={product}
      />

      {addToCartError ? (
        <SupportingText className="text-sm text-danger">
          {addToCartError}
        </SupportingText>
      ) : null}
    </div>
  );
}
