"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/storefront/auth";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import {
  getProductListItems,
  isFavoriteProductList,
  type StoreProductListItem,
  useCreateCustomProductList,
  useCreateProductListCart,
  useDeleteProductList,
  useDeleteProductListItem,
  useProductList,
  useProductLists,
  useUpdateProductListItem,
} from "@/lib/storefront/product-lists";
import {
  PRODUCT_CARD_FIELDS,
  type ProductListInput,
  useProducts,
} from "@/lib/storefront/products";
import { resolveRegionCurrency } from "@/lib/storefront/region-selection";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";
import {
  buildProductMap,
  resolveProductListPriceSummary,
  sortProductLists,
  uniqueProductIds,
} from "./account-product-lists.utils";

const resolveListCartErrorMessage = (error: unknown) => {
  const errorMessage = resolveErrorMessage(
    error,
    "Zoznam sa nepodarilo pridať do košíka.",
  );

  if (/has no variant selected|no variant/i.test(errorMessage)) {
    return "Niektoré produkty v zozname nemajú vybranú variantu.";
  }

  return errorMessage;
};

export function useAccountProductLists() {
  const authQuery = useAuth();
  const region = useRegionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeQuantitySetItemId, setActiveQuantitySetItemId] = useState<
    string | null
  >(null);
  const [activeDeleteItemId, setActiveDeleteItemId] = useState<string | null>(
    null,
  );
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
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
  const activeListSupportsQuantity = Boolean(activeList);
  const activeListCanMutate = activeList
    ? !isFavoriteProductList(activeList)
    : false;
  const deleteList = useMemo(
    () =>
      sortedLists.find(
        (list) => list.id === deleteListId && !isFavoriteProductList(list),
      ) ?? null,
    [deleteListId, sortedLists],
  );
  const activeItems = useMemo(
    () => getProductListItems(activeList),
    [activeList],
  );
  const productIds = useMemo(
    () => uniqueProductIds(activeItems),
    [activeItems],
  );
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
  const regionCurrencyCode = resolveRegionCurrency(region);
  const activeListPriceSummary = useMemo(
    () =>
      resolveProductListPriceSummary({
        currencyCode: regionCurrencyCode,
        items: activeItems,
        productsById,
      }),
    [activeItems, productsById, regionCurrencyCode],
  );
  const createListMutation = useCreateCustomProductList();
  const createListCartMutation = useCreateProductListCart();
  const deleteListMutation = useDeleteProductList();
  const updateItemMutation = useUpdateProductListItem();
  const deleteItemMutation = useDeleteProductListItem();
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });
  const activeListCanCreateCart = Boolean(
    activeList?.id &&
      activeItems.length > 0 &&
      (region?.region_id || region?.country_code),
  );

  useEffect(() => {
    if (sortedLists.length === 0) {
      setActiveListId(null);
      return;
    }

    const requestedListId = searchParams.get("list");
    const requestedListExists = sortedLists.some(
      (list) => list.id === requestedListId,
    );
    const activeListExists = sortedLists.some(
      (list) => list.id === activeListId,
    );
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

  const openCreateListDialog = () => {
    setShowCreateListDialog(true);
    setStatusError(null);
  };

  const closeCreateListDialog = () => {
    setShowCreateListDialog(false);
    setNewListTitle("");
    setStatusError(null);
  };

  const openDeleteListDialog = (listId: string) => {
    const list = sortedLists.find((candidate) => candidate.id === listId);
    if (!list || isFavoriteProductList(list)) {
      return;
    }

    setDeleteListId(listId);
    setStatusError(null);
  };

  const closeDeleteListDialog = () => {
    setDeleteListId(null);
    setStatusError(null);
  };

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newListTitle.trim();
    if (!title) {
      setStatusError("Zadajte názov zoznamu.");
      return;
    }

    setStatusError(null);

    try {
      const createdList = await createListMutation.mutateAsync({
        title,
        access_type: "private",
      });

      if (createdList?.id) {
        selectList(createdList.id);
      }

      setNewListTitle("");
      setShowCreateListDialog(false);
    } catch (error) {
      setStatusError(
        resolveErrorMessage(error, "Zoznam sa nepodarilo vytvoriť."),
      );
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

    try {
      await addToCart.addProductToCart({
        product,
        quantity,
        variantId: item.variant_id,
      });
    } catch (error) {
      setStatusError(resolveErrorMessage(error, "Pridanie do košíka zlyhalo."));
    } finally {
      setActiveProductId(null);
    }
  };

  const handleAddListToCart = async () => {
    if (!activeList?.id) {
      return;
    }

    if (!region?.region_id && !region?.country_code) {
      setStatusError("Región sa ešte načítava. Skúste to prosím o chvíľu.");
      return;
    }

    setStatusError(null);

    try {
      await createListCartMutation.mutateAsync({
        listId: activeList.id,
        regionId: region.region_id,
        countryCode: region.country_code,
        email: authQuery.customer?.email,
      });
    } catch (error) {
      setStatusError(resolveListCartErrorMessage(error));
    }
  };

  const handleQuantitySet = async (
    item: StoreProductListItem,
    quantity: number,
  ) => {
    if (!item.id || !activeListSupportsQuantity) {
      return;
    }

    const nextQuantity = Math.floor(quantity);
    const currentQuantity =
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1;

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      return;
    }

    if (nextQuantity === currentQuantity) {
      return;
    }

    setActiveQuantitySetItemId(item.id);
    setStatusError(null);

    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        quantity: nextQuantity,
      });
    } catch (error) {
      setStatusError(
        resolveErrorMessage(error, "Množstvo sa nepodarilo upraviť."),
      );
    } finally {
      setActiveQuantitySetItemId(null);
    }
  };

  const handleDeleteList = async () => {
    if (!deleteList?.id) {
      return;
    }

    const deletedListId = deleteList.id;
    const deletedListIndex = sortedLists.findIndex(
      (list) => list.id === deletedListId,
    );
    const nextList =
      sortedLists[deletedListIndex - 1] ??
      sortedLists.find((list) => list.id !== deletedListId) ??
      null;

    setStatusError(null);

    try {
      await deleteListMutation.mutateAsync({ listId: deletedListId });

      if (activeListId === deletedListId) {
        if (nextList?.id) {
          selectList(nextList.id);
        } else {
          setActiveListId(null);
          router.replace("/account/lists", { scroll: false });
        }
      }

      setDeleteListId(null);
    } catch (error) {
      setStatusError(
        resolveErrorMessage(error, "Zoznam sa nepodarilo zmazať."),
      );
    }
  };

  const handleDeleteItem = async (item: StoreProductListItem) => {
    if (!activeList?.id || !item.id) {
      return;
    }

    setActiveDeleteItemId(item.id);
    setStatusError(null);

    try {
      await deleteItemMutation.mutateAsync({
        listId: activeList.id,
        itemId: item.id,
      });
    } catch (error) {
      setStatusError(
        resolveErrorMessage(
          error,
          "Produkt sa nepodarilo odstrániť zo zoznamu.",
        ),
      );
    } finally {
      setActiveDeleteItemId(null);
    }
  };

  return {
    activeDeleteItemId,
    activeItems,
    activeList,
    activeListCanCreateCart,
    activeListPriceSummary,
    activeListCanMutate,
    activeListId,
    activeListSupportsQuantity,
    activeListQuery,
    activeProductId,
    activeQuantitySetItemId,
    closeCreateListDialog,
    closeDeleteListDialog,
    createListCartMutation,
    createListMutation,
    deleteList,
    deleteListId,
    deleteListMutation,
    handleAddToCart,
    handleAddListToCart,
    handleCreateList,
    handleDeleteList,
    handleDeleteItem,
    handleQuantitySet,
    listsQuery,
    newListTitle,
    openCreateListDialog,
    openDeleteListDialog,
    productsById,
    selectList,
    setNewListTitle,
    setShowCreateListDialog,
    setStatusError,
    showCreateListDialog,
    sortedLists,
    statusError,
  };
}
