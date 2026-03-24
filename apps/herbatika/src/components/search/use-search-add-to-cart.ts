"use client";

import type { HttpTypes } from "@medusajs/types";
import { useState } from "react";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";

type UseSearchAddToCartInput = {
  regionId?: string;
  countryCode?: string;
};

export const useSearchAddToCart = ({
  regionId,
  countryCode,
}: UseSearchAddToCartInput) => {
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const addToCart = useAddProductToCart({
    regionId,
    countryCode,
  });

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    try {
      await addToCart.addProductToCart({
        product,
        quantity: 1,
      });
    } catch (error) {
      setAddToCartError(
        error instanceof Error
          ? error.message
          : "Pridanie do košíka zlyhalo.",
      );
    }
  };

  return {
    addToCartError,
    activeProductId: addToCart.activeProductId,
    isAddPending: addToCart.isAddPending,
    handleAddToCart,
  };
};
