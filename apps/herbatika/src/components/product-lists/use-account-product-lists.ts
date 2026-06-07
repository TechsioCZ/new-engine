"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/storefront/auth";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import {
  PRODUCT_CARD_FIELDS,
  type ProductListInput,
  useProducts,
} from "@/lib/storefront/products";
import {
  getProductListItems,
  isFavoriteProductList,
  type StoreProductListItem,
  useCreateCustomProductList,
  useIncrementProductListItem,
  useProductList,
  useProductLists,
} from "@/lib/storefront/product-lists";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";
import {
  buildProductMap,
  sortProductLists,
  uniqueProductIds,
} from "./account-product-lists.utils";

export function useAccountProductLists() {
  const authQuery = useAuth();
  const region = useRegionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeIncrementItemId, setActiveIncrementItemId] = useState<
    string | null
  >(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const listsQuery = useProductLists({
    limit: 100,
    enabled: authQuery.isAuthenticated,
  });
  const sortedLists = useMemo(
    () => sortProductLists(listsQuery.productLists),
    [listsQuery.productLists],
  );
  const activeListQuery = useProductList(activeListId, {
    enabled: authQuery.isAuthenticated && Boolean(activeListId),
  });
  const activeList =
    activeListQuery.productList ??
    sortedLists.find((list) => list.id === activeListId) ??
    null;
  const activeListSupportsQuantity = activeList
    ? !isFavoriteProductList(activeList)
    : false;
  const activeItems = useMemo(
    () => getProductListItems(activeList),
    [activeList],
  );
  const productIds = useMemo(() => uniqueProductIds(activeItems), [activeItems]);
  const productsQuery = useProducts({
    id: productIds.length > 0 ? productIds : undefined,
    page: 1,
    limit: Math.max(productIds.length, 1),
    fields: PRODUCT_CARD_FIELDS,
    enabled: Boolean(region?.region_id && activeListId && productIds.length),
  } as ProductListInput);
  const productsById = useMemo(
    () => buildProductMap(activeItems, productsQuery.products),
    [activeItems, productsQuery.products],
  );
  const createListMutation = useCreateCustomProductList();
  const incrementMutation = useIncrementProductListItem();
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });

  useEffect(() => {
    if (sortedLists.length === 0) {
      setActiveListId(null);
      return;
    }

    const requestedListId = searchParams.get("list");
    const requestedListExists = sortedLists.some(
      (list) => list.id === requestedListId,
    );
    const activeListExists = sortedLists.some((list) => list.id === activeListId);
    const nextActiveListId =
      requestedListId && requestedListExists
        ? requestedListId
        : activeListExists
          ? activeListId
          : sortedLists[0].id;

    if (nextActiveListId !== activeListId) {
      setActiveListId(nextActiveListId);
    }
  }, [activeListId, searchParams, sortedLists]);

  const selectList = (listId: string) => {
    setActiveListId(listId);
    router.replace(`/account/lists?list=${encodeURIComponent(listId)}`, {
      scroll: false,
    });
  };

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newListTitle.trim();
    if (!title) {
      setStatusError("Zadejte název seznamu.");
      return;
    }

    setStatusError(null);
    setStatusMessage(null);

    try {
      const createdList = await createListMutation.mutateAsync({
        title,
        access_type: "private",
      });

      if (createdList?.id) {
        selectList(createdList.id);
      }

      setNewListTitle("");
      setShowCreateForm(false);
      setStatusMessage("Seznam byl vytvořen.");
    } catch (error) {
      setStatusError(resolveErrorMessage(error, "Seznam se nepodařilo vytvořit."));
    }
  };

  const handleAddToCart = async (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct,
  ) => {
    const quantity =
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1;

    setActiveProductId(product.id);
    setStatusError(null);
    setStatusMessage(null);

    try {
      await addToCart.addProductToCart({
        product,
        quantity,
        variantId: item.variant_id,
      });
      setStatusMessage("Produkt byl přidán do košíku.");
    } catch (error) {
      setStatusError(resolveErrorMessage(error, "Pridanie do košíka zlyhalo."));
    } finally {
      setActiveProductId(null);
    }
  };

  const handleIncrement = async (item: StoreProductListItem) => {
    if (!item.id || !activeListSupportsQuantity) {
      return;
    }

    setActiveIncrementItemId(item.id);
    setStatusError(null);
    setStatusMessage(null);

    try {
      await incrementMutation.mutateAsync({ itemId: item.id, quantity: 1 });
      setStatusMessage("Množství v seznamu bylo navýšeno.");
    } catch (error) {
      setStatusError(resolveErrorMessage(error, "Množství se nepodařilo navýšit."));
    } finally {
      setActiveIncrementItemId(null);
    }
  };

  return {
    activeIncrementItemId,
    activeItems,
    activeList,
    activeListId,
    activeListSupportsQuantity,
    activeListQuery,
    activeProductId,
    createListMutation,
    handleAddToCart,
    handleCreateList,
    handleIncrement,
    listsQuery,
    newListTitle,
    productsById,
    selectList,
    setNewListTitle,
    setShowCreateForm,
    setStatusError,
    setStatusMessage,
    showCreateForm,
    sortedLists,
    statusError,
    statusMessage,
  };
}
