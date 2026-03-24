import type { HttpTypes } from "@medusajs/types";
import { useEffect, useState } from "react";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";

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
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });

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

    try {
      await addToCart.addProductToCart({
        product,
        quantity: 1,
      });
      setCartMessage(`Pridané do košíka: ${product.title}`);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    }
  };

  return {
    cartMessage,
    mutationError,
    isProductAdding: (product) => addToCart.isProductAdding(product.id),
    handleAddToCart,
  };
}
