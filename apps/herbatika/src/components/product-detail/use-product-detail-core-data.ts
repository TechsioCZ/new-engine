"use client"

import { useState } from "react"

import { resolveSelectedVariant } from "@/components/product-detail/product-detail-data.utils"
import { resolveInitialVariantId } from "@/components/product-detail/product-detail-selection"
import {
  createDefaultSelection,
  createSelectionKey,
  resolveAvailableQuantity,
  resolveCurrentSelection,
  updateCurrentSelection,
} from "@/components/product-detail/product-detail-selection-state"
import type { ProductDetailSelectionState } from "@/components/product-detail/product-detail-selection-state"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import { PRODUCT_DETAIL_FIELDS, useProduct } from "@/lib/storefront/products"
import { storefront } from "@/lib/storefront/storefront"

interface UseProductDetailCoreDataProps {
  handle: string
  initialVariantId?: string
}

export const useProductDetailCoreData = ({
  handle,
  initialVariantId,
}: UseProductDetailCoreDataProps) => {
  const [selectionState, setSelectionState] =
    useState<ProductDetailSelectionState>(() => {
      const defaultSelectedVariantId = initialVariantId ?? null
      return createDefaultSelection(
        createSelectionKey(`handle:${handle}`, defaultSelectedVariantId),
        defaultSelectedVariantId,
      )
    })
  const productQuery = useProduct({ fields: PRODUCT_DETAIL_FIELDS, handle })
  const product = productQuery.product ?? null
  const productCategories = product?.categories ?? []
  const variants = product?.variants ?? []
  const initialSelectedVariantId = resolveInitialVariantId(
    variants,
    initialVariantId,
  )
  const selectionKey = createSelectionKey(
    product?.id ?? `handle:${handle}`,
    initialSelectedVariantId,
  )
  const currentSelection = resolveCurrentSelection(
    selectionState,
    selectionKey,
    initialSelectedVariantId,
  )
  const selectedVariant = resolveSelectedVariant(
    variants,
    currentSelection.selectedVariantId,
  )
  const productId = product?.id ?? null
  const productLocationAvailabilityQuery =
    storefront.hooks.productLocationAvailability.useProductLocationAvailability(
      { productId },
    )
  const productAttributesQuery =
    storefront.hooks.productAttributes.useProductAttributes({ productId })
  const preliminaryInventory = resolveVariantInventoryState(
    selectedVariant,
    currentSelection.quantity,
  )
  const quantity = resolveAvailableQuantity(
    currentSelection.quantity,
    preliminaryInventory.availableQuantity,
  )
  const selectedVariantInventory = resolveVariantInventoryState(
    selectedVariant,
    quantity,
  )

  const setQuantity = (nextQuantity: number) => {
    setSelectionState((current) =>
      updateCurrentSelection(current, selectionKey, initialSelectedVariantId, {
        quantity: nextQuantity,
      }),
    )
  }
  const setSelectedVariantId = (nextVariantId: string | null) => {
    setSelectionState((current) => {
      const currentForProduct = resolveCurrentSelection(
        current,
        selectionKey,
        initialSelectedVariantId,
      )
      const nextInventory = resolveVariantInventoryState(
        resolveSelectedVariant(variants, nextVariantId),
        currentForProduct.quantity,
      )
      const nextQuantity = resolveAvailableQuantity(
        currentForProduct.quantity,
        nextInventory.availableQuantity,
      )

      return updateCurrentSelection(
        currentForProduct,
        selectionKey,
        initialSelectedVariantId,
        { quantity: nextQuantity, selectedVariantId: nextVariantId },
      )
    })
  }
  const setSelectedVolumeDiscountId = (nextOptionId: string | null) => {
    setSelectionState((current) =>
      updateCurrentSelection(current, selectionKey, initialSelectedVariantId, {
        selectedVolumeDiscountId: nextOptionId,
      }),
    )
  }

  return {
    currentSelection,
    product,
    productAttributesQuery,
    productCategories,
    productLocationAvailabilityQuery,
    productQuery,
    quantity,
    selectedVariant,
    selectedVariantInventory,
    setQuantity,
    setSelectedVariantId,
    setSelectedVolumeDiscountId,
    variants,
  }
}
