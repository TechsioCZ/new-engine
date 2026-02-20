import type { HttpTypes } from "@medusajs/types";
import { useEffect, useState } from "react";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";

type RegionLike = {
  region_id?: string;
  country_code?: string;
} | null;

type UseHomepageCartActionsResult = {
  cartMessage: string | null;
  mutationError: string | null;
  isProductAdding: (product: HttpTypes.StoreProduct) => boolean;
  handleAddToCart: (product: HttpTypes.StoreProduct) => Promise<void>;
};

export function useHomepageCartActions(
  region: RegionLike,
): UseHomepageCartActionsResult {
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });
  const addLineItem = useAddLineItem();

  useEffect(() => {
    if (!cartMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setCartMessage(null);
    }, 3500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cartMessage]);

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setMutationError(null);
    setCartMessage(null);

    const variantId = product.variants?.[0]?.id;

    if (!region?.region_id) {
      setMutationError("Región sa ešte načítava. Skúste to prosím o chvíľu.");
      return;
    }

    if (!variantId) {
      setMutationError(
        "Produkt nemá dostupnú variantu pre vloženie do košíka.",
      );
      return;
    }

    try {
      setAddingVariantId(variantId);
      await addLineItem.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: 1,
        autoCreate: true,
        region_id: region.region_id,
        country_code: region.country_code,
      });
      setCartMessage(`Pridané do košíka: ${product.title}`);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    } finally {
      setAddingVariantId(null);
    }
  };

  return {
    cartMessage,
    mutationError,
    isProductAdding: (product) => addingVariantId === product.variants?.[0]?.id,
    handleAddToCart,
  };
}
