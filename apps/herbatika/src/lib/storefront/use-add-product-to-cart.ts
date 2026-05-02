"use client";

import type { HttpTypes } from "@medusajs/types";
import { useState } from "react";
import {
  cartReadQueryOptions,
  useAddLineItem,
  useCart,
} from "./cart";
import { resolveErrorMessage } from "./error-utils";

type AddToCartMessages = {
  missingRegion?: string;
  missingVariant?: string;
  unavailableInRegion?: string;
  failed?: string;
};

type UseAddProductToCartProps = {
  regionId?: string;
  countryCode?: string;
  messages?: AddToCartMessages;
};

type AddProductToCartInput = {
  product: Pick<HttpTypes.StoreProduct, "id" | "title" | "variants">;
  quantity?: number;
  variantId?: string | null;
};

const DEFAULT_MESSAGES = {
  missingRegion: "Región sa ešte načítava. Skúste to prosím o chvíľu.",
  missingVariant: "Produkt nemá dostupnú variantu na pridanie do košíka.",
  unavailableInRegion:
    "Produkt nie je momentálne dostupný pre vybraný región.",
  failed: "Pridanie do košíka zlyhalo.",
} satisfies Required<AddToCartMessages>;

const resolveProductVariantId = (
  product: AddProductToCartInput["product"],
  variantId?: string | null,
) => {
  if (variantId) {
    return variantId;
  }

  return product.variants?.[0]?.id ?? null;
};

const resolveProductVariant = (
  product: AddProductToCartInput["product"],
  variantId?: string | null,
) => {
  const resolvedVariantId = resolveProductVariantId(product, variantId);
  if (!resolvedVariantId) {
    return null;
  }

  return (
    product.variants?.find((variant) => variant.id === resolvedVariantId) ?? null
  );
};

export function useAddProductToCart({
  regionId,
  countryCode,
  messages,
}: UseAddProductToCartProps) {
  const resolvedMessages = {
    ...DEFAULT_MESSAGES,
    ...messages,
  };
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const cartQuery = useCart(
    {
      autoCreate: true,
      region_id: regionId,
      country_code: countryCode,
      enabled: Boolean(regionId),
    },
    {
      queryOptions: cartReadQueryOptions,
    },
  );
  const addLineItemMutation = useAddLineItem();

  const addProductToCart = async ({
    product,
    quantity = 1,
    variantId,
  }: AddProductToCartInput) => {
    if (!regionId) {
      throw new Error(resolvedMessages.missingRegion);
    }

    const resolvedVariant = resolveProductVariant(product, variantId);
    const resolvedVariantId = resolvedVariant?.id ?? null;

    if (!resolvedVariantId || !resolvedVariant) {
      throw new Error(resolvedMessages.missingVariant);
    }

    const resolvedVariantAmount = resolvedVariant.calculated_price?.calculated_amount;

    if (typeof resolvedVariantAmount !== "number") {
      throw new Error(resolvedMessages.unavailableInRegion);
    }

    setActiveProductId(product.id);

    try {
      await addLineItemMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId: resolvedVariantId,
        quantity,
        autoCreate: true,
        region_id: regionId,
        country_code: countryCode,
      });
    } catch (error) {
      throw new Error(resolveErrorMessage(error, resolvedMessages.failed));
    } finally {
      setActiveProductId(null);
    }
  };

  return {
    addProductToCart,
    activeProductId,
    cartQuery,
    isAddPending: addLineItemMutation.isPending,
    isProductAdding: (productId: string) =>
      addLineItemMutation.isPending && activeProductId === productId,
  };
}
