"use client";

import type { HttpTypes } from "@medusajs/types";
import { useState } from "react";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import { resolveErrorMessage } from "./search-query-config";

type UseSearchAddToCartInput = {
  regionId?: string;
  countryCode?: string;
};

export const useSearchAddToCart = ({
  regionId,
  countryCode,
}: UseSearchAddToCartInput) => {
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const cartQuery = useCart({
    autoCreate: true,
    region_id: regionId,
    country_code: countryCode,
    enabled: Boolean(regionId),
  });
  const addLineItemMutation = useAddLineItem();

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    const variantId = product.variants?.[0]?.id;
    if (!variantId || !regionId) {
      setAddToCartError(
        "Produkt nemá dostupnú variantu na pridanie do košíka.",
      );
      return;
    }

    setActiveProductId(product.id);

    try {
      await addLineItemMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: 1,
        autoCreate: true,
        region_id: regionId,
        country_code: countryCode,
      });
    } catch (error) {
      setAddToCartError(resolveErrorMessage(error));
    } finally {
      setActiveProductId(null);
    }
  };

  return {
    addToCartError,
    activeProductId,
    isAddPending: addLineItemMutation.isPending,
    handleAddToCart,
  };
};
