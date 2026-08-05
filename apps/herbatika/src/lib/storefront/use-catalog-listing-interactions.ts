"use client"

import type { HttpTypes } from "@medusajs/types"
import type { SetValues } from "nuqs"
import { useEffect } from "react"

import { toggleSelection } from "@/components/category/category-selection-utils"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveCatalogQueryStatePatch } from "@/lib/storefront/plp-query-state"
import type {
  NuqsPlpQueryState,
  ProductSortValue,
  plpQueryParsers,
} from "@/lib/storefront/plp-query-state"
import {
  PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products"
import { useAddProductToCartAction } from "@/lib/storefront/use-add-product-to-cart-action"

type CatalogMultiSelectKey = "status" | "form" | "brand" | "ingredient"

interface UseCatalogListingInteractionsInput {
  countryCode?: string
  productPrefetchKeyPrefix: string
  queryState: NuqsPlpQueryState
  regionId?: string
  setQueryState: SetValues<typeof plpQueryParsers>
}

interface UseCatalogListingPageBoundsInput {
  isLoading: boolean
  isQueryEnabled: boolean
  page: number
  setQueryState: SetValues<typeof plpQueryParsers>
  totalPages: number
}

const resolveNextMultiSelectValues = (
  key: CatalogMultiSelectKey,
  queryState: NuqsPlpQueryState,
  itemId: string,
) => {
  switch (key) {
    case "status": {
      return { status: toggleSelection(queryState.status, itemId) }
    }
    case "form": {
      return { form: toggleSelection(queryState.form, itemId) }
    }
    case "brand": {
      return { brand: toggleSelection(queryState.brand, itemId) }
    }
    case "ingredient": {
      return { ingredient: toggleSelection(queryState.ingredient, itemId) }
    }
    default: {
      return {}
    }
  }
}

export function useCatalogListingPageBounds({
  isLoading,
  isQueryEnabled,
  page,
  setQueryState,
  totalPages,
}: UseCatalogListingPageBoundsInput) {
  useEffect(() => {
    if (!isQueryEnabled || isLoading) {
      return
    }

    const safeLastPage = Math.max(totalPages, 1)
    if (page <= safeLastPage) {
      return
    }

    runDetachedPromise(setQueryState({ page: safeLastPage }))
  }, [isLoading, isQueryEnabled, page, setQueryState, totalPages])
}

export function useCatalogListingInteractions({
  countryCode,
  productPrefetchKeyPrefix,
  queryState,
  regionId,
  setQueryState,
}: UseCatalogListingInteractionsInput) {
  const addToCart = useAddProductToCartAction({
    ...(regionId === undefined ? {} : { regionId }),
    ...(countryCode === undefined ? {} : { countryCode }),
  })
  const prefetchProduct = usePrefetchProduct({
    defaultDelay: 180,
    skipMode: "any",
  })

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    await addToCart.addProductToCart({
      product,
      quantity: 1,
    })
  }

  const patchMultiSelect = (key: CatalogMultiSelectKey, itemId: string) => {
    runDetachedPromise(
      setQueryState(
        resolveCatalogQueryStatePatch(
          queryState,
          resolveNextMultiSelectValues(key, queryState, itemId),
        ),
      ),
    )
  }

  return {
    isProductAdding: (productId: string) =>
      addToCart.isProductAdding(productId),
    onAddToCart: handleAddToCart,
    onBrandToggle: (itemId: string) => {
      patchMultiSelect("brand", itemId)
    },
    onFormToggle: (itemId: string) => {
      patchMultiSelect("form", itemId)
    },
    onIngredientToggle: (itemId: string) => {
      patchMultiSelect("ingredient", itemId)
    },
    onPriceRangeCommit: (range: { min?: number; max?: number }) => {
      runDetachedPromise(
        setQueryState(
          resolveCatalogQueryStatePatch(queryState, {
            price_max: range.max ?? null,
            price_min: range.min ?? null,
          }),
        ),
      )
    },
    onProductHoverEnd: (product: HttpTypes.StoreProduct) => {
      prefetchProduct.cancelPrefetch(
        `${productPrefetchKeyPrefix}-${product.id}`,
      )
    },
    onProductHoverStart: (product: HttpTypes.StoreProduct) => {
      if (!product.handle) {
        return
      }

      prefetchProduct.delayedPrefetch(
        { fields: PRODUCT_DETAIL_FIELDS, handle: product.handle },
        180,
        `${productPrefetchKeyPrefix}-${product.id}`,
      )
    },
    onResetFilters: () => {
      runDetachedPromise(
        setQueryState(
          resolveCatalogQueryStatePatch(
            queryState,
            {
              brand: [],
              form: [],
              ingredient: [],
              price_max: null,
              price_min: null,
              status: [],
            },
            { resetPage: "always" },
          ),
        ),
      )
    },
    onSortChange: (value: ProductSortValue) => {
      runDetachedPromise(
        setQueryState(
          resolveCatalogQueryStatePatch(queryState, { sort: value }),
        ),
      )
    },
    onStatusToggle: (itemId: string) => {
      patchMultiSelect("status", itemId)
    },
    page: queryState.page,
    queryState,
    selectedPriceRange: {
      ...(queryState.price_min === null || queryState.price_min === undefined
        ? {}
        : { min: queryState.price_min }),
      ...(queryState.price_max === null || queryState.price_max === undefined
        ? {}
        : { max: queryState.price_max }),
    },
  }
}
