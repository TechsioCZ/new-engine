"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import Image from "next/image"
import { useTranslations } from "next-intl"
import NextLink from "next/link"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants"
import { resolvePriceState } from "@/components/product-card/product-card.pricing"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"
import {
  resolveProductListItemAvailability,
  resolveProductListItemQuantity,
} from "./account-product-lists.utils"

type AccountProductListItemRowProps = {
  canChangeQuantity: boolean
  isAddingToCart: boolean
  isDeleting: boolean
  isSettingQuantity: boolean
  item: StoreProductListItem
  onAddToCart: (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct
  ) => void
  onDelete: (item: StoreProductListItem) => void
  onQuantitySet: (item: StoreProductListItem, quantity: number) => void
  product: HttpTypes.StoreProduct | null
}

export function AccountProductListItemRow({
  canChangeQuantity,
  isAddingToCart,
  isDeleting,
  isSettingQuantity,
  item,
  onAddToCart,
  onDelete,
  onQuantitySet,
  product,
}: AccountProductListItemRowProps) {
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const tCatalog = useTranslations("catalog")
  const itemProduct = product ?? item.product ?? null
  const productTitle =
    itemProduct?.title?.trim() || item.product_id || item.id || ""
  const productHref = itemProduct?.handle ? `/p/${itemProduct.handle}` : "#"
  const imageSrc = itemProduct?.thumbnail ?? PRODUCT_FALLBACK_IMAGE
  const price = itemProduct
    ? resolvePriceState(
        itemProduct,
        undefined,
        tCatalog("product_card.price_on_request")
      )
    : null
  const quantity = resolveProductListItemQuantity(item)
  const availability = resolveProductListItemAvailability(item, itemProduct)
  const availabilityLabel =
    availability.status === "product_unavailable"
      ? tAuth("product_lists.availability.product_unavailable")
      : availability.status === "out_of_stock"
        ? tAuth("product_lists.availability.out_of_stock")
        : availability.status === "limited_stock" &&
            availability.availableQuantity !== null
          ? tAuth("product_lists.availability.limited_stock", {
              quantity: availability.availableQuantity,
            })
          : null
  const canAddToCart = availability.canAddToCart
  const availabilityBadgeId = useId()
  const [localQuantity, setLocalQuantity] = useState(quantity)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingUpdate = useCallback(() => {
    if (updateTimeoutRef.current === null) {
      return
    }

    clearTimeout(updateTimeoutRef.current)
    updateTimeoutRef.current = null
  }, [])

  useEffect(() => {
    setLocalQuantity(quantity)
    clearPendingUpdate()
  }, [clearPendingUpdate, quantity])

  useEffect(() => clearPendingUpdate, [clearPendingUpdate])

  const handleQuantityChange = (nextQuantity: number) => {
    if (!item.id || isSettingQuantity || !Number.isFinite(nextQuantity)) {
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
    <article className="flex flex-col gap-300 border-border-secondary border-b bg-base p-300 md:flex-row md:items-center">
      <NextLink className="shrink-0" href={productHref}>
        <Image
          alt={productTitle}
          className="h-850 w-850 rounded-md object-contain"
          height={80}
          src={imageSrc}
          width={80}
        />
      </NextLink>

      <div className="min-w-0 flex-1 space-y-100">
        <Link
          as={NextLink}
          className="block truncate font-semibold text-primary text-sm underline"
          href={productHref}
        >
          {productTitle}
        </Link>
        {item.variant?.title ? (
          <p className="truncate text-fg-secondary text-xs">
            {item.variant.title}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-300 gap-y-100 text-sm">
          {canChangeQuantity ? null : (
            <span className="text-fg-secondary">
              {tAuth("product_lists.item.quantity", { quantity })}
            </span>
          )}
          {price ? (
            <span className="font-semibold">{price.currentLabel}</span>
          ) : null}
          {availabilityLabel ? (
            <Badge
              id={availabilityBadgeId}
              size="sm"
              variant={availability.badgeVariant}
            >
              {availabilityLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-300">
        {canChangeQuantity ? (
          <NumericInput
            allowOverflow={false}
            className="w-20"
            disabled={!item.id || isSettingQuantity}
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
        ) : null}
        <Button
          aria-describedby={
            availabilityLabel ? availabilityBadgeId : undefined
          }
          disabled={!canAddToCart}
          icon="token-icon-cart"
          isLoading={isAddingToCart}
          loadingText={tCart("adding_to_cart")}
          onClick={() => {
            if (itemProduct) {
              onAddToCart(item, itemProduct)
            }
          }}
          size="sm"
          variant="primary"
        >
          {tCart("add_to_cart")}
        </Button>
        <Button
          aria-label={tAuth("product_lists.item.remove_aria", {
            productName: productTitle,
          })}
          className="text-danger"
          disabled={!item.id || isDeleting}
          icon="token-icon-trash"
          iconSize="md"
          isLoading={isDeleting}
          loadingText={tAuth("product_lists.item.removing")}
          onClick={() => onDelete(item)}
          size="current"
          theme="unstyled"
          variant="danger"
        />
      </div>
    </article>
  )
}
