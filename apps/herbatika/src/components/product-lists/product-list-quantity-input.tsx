"use client"

import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import type { StoreProductListItem } from "@/lib/storefront/product-lists"

interface ProductListQuantityInputProps {
  isSettingQuantity: boolean
  item: StoreProductListItem
  onQuantitySet: (item: StoreProductListItem, quantity: number) => void
  productTitle: string
  quantity: number
}

export const ProductListQuantityInput = ({
  isSettingQuantity,
  item,
  onQuantitySet,
  productTitle,
  quantity,
}: ProductListQuantityInputProps) => {
  const tAuth = useTranslations("auth")
  const [localQuantity, setLocalQuantity] = useState(quantity)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingUpdate = () => {
    if (updateTimeoutRef.current !== null) {
      clearTimeout(updateTimeoutRef.current)
      updateTimeoutRef.current = null
    }
  }

  useEffect(
    () => () => {
      clearPendingUpdate()
    },
    [],
  )

  const handleQuantityChange = (nextQuantity: number) => {
    if (
      item.id === undefined ||
      item.id === "" ||
      isSettingQuantity ||
      !Number.isFinite(nextQuantity)
    ) {
      return
    }

    const normalizedQuantity = Math.max(1, Math.round(nextQuantity))
    setLocalQuantity(normalizedQuantity)
    clearPendingUpdate()

    if (normalizedQuantity === quantity) {
      return
    }

    updateTimeoutRef.current = setTimeout(() => {
      onQuantitySet(item, normalizedQuantity)
      updateTimeoutRef.current = null
    }, 250)
  }

  return (
    <NumericInput
      allowOverflow={false}
      className="w-product-list-quantity"
      disabled={item.id === undefined || item.id === "" || isSettingQuantity}
      min={1}
      onChange={handleQuantityChange}
      size="sm"
      step={1}
      value={localQuantity}
    >
      <NumericInput.Control>
        <NumericInput.DecrementTrigger
          disabled={isSettingQuantity || localQuantity <= 1}
        />
        <NumericInput.Input
          aria-label={tAuth("product_lists.item.quantity_aria", {
            productName: productTitle,
          })}
        />
        <NumericInput.IncrementTrigger disabled={isSettingQuantity} />
      </NumericInput.Control>
    </NumericInput>
  )
}
