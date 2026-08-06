"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useId, useRef, useState } from "react"

import NextLink from "@/components/app-link"
import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants"
import { resolvePriceState } from "@/components/product-card/product-card.pricing"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"

import {
  resolveProductListItemAvailability,
  resolveProductListItemQuantity,
} from "./account-product-lists.utils"

interface AccountProductListItemRowProps {
  state: {
    canChangeQuantity: boolean
    isAddingToCart: boolean
    isDeleting: boolean
    isSettingQuantity: boolean
  }
  item: StoreProductListItem
  onAddToCart: (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct,
  ) => void
  onDelete: (item: StoreProductListItem) => void
  onQuantitySet: (item: StoreProductListItem, quantity: number) => void
  product: HttpTypes.StoreProduct | null
}

type AuthTranslator = ReturnType<typeof useTranslations<"auth">>

const resolveAvailabilityLabel = (
  availability: ReturnType<typeof resolveProductListItemAvailability>,
  translate: AuthTranslator,
) => {
  if (availability.status === "product_unavailable") {
    return translate("product_lists.availability.product_unavailable")
  }

  if (availability.status === "out_of_stock") {
    return translate("product_lists.availability.out_of_stock")
  }

  if (
    availability.status === "limited_stock" &&
    availability.availableQuantity !== null
  ) {
    return translate("product_lists.availability.limited_stock", {
      quantity: availability.availableQuantity,
    })
  }

  return null
}

interface ProductListQuantityInputProps {
  isSettingQuantity: boolean
  item: StoreProductListItem
  onQuantitySet: (item: StoreProductListItem, quantity: number) => void
  productTitle: string
  quantity: number
}

const ProductListQuantityInput = ({
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

const resolveProductTitle = (
  itemProduct: HttpTypes.StoreProduct | null,
  item: StoreProductListItem,
) => {
  const trimmedTitle = itemProduct?.title?.trim()
  if (trimmedTitle !== undefined && trimmedTitle !== "") {
    return trimmedTitle
  }
  if (
    item.product_id !== null &&
    item.product_id !== undefined &&
    item.product_id !== ""
  ) {
    return item.product_id
  }
  return item.id ?? ""
}

const resolveProductListItemPresentation = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct | null,
  priceUnavailableLabel: string,
) => {
  const itemProduct = product ?? item.product ?? null
  const productTitle = resolveProductTitle(itemProduct, item)
  const productHref =
    itemProduct?.handle === null ||
    itemProduct?.handle === undefined ||
    itemProduct.handle === ""
      ? "#"
      : `/p/${itemProduct.handle}`
  const imageSrc = itemProduct?.thumbnail ?? PRODUCT_FALLBACK_IMAGE
  const price =
    itemProduct === null
      ? null
      : resolvePriceState(itemProduct, undefined, priceUnavailableLabel)
  const quantity = resolveProductListItemQuantity(item)
  const availability = resolveProductListItemAvailability(item, itemProduct)

  return {
    availability,
    imageSrc,
    itemProduct,
    price,
    productHref,
    productTitle,
    quantity,
  }
}

export const AccountProductListItemRow = ({
  item,
  onAddToCart,
  onDelete,
  onQuantitySet,
  product,
  state,
}: AccountProductListItemRowProps) => {
  const { canChangeQuantity, isAddingToCart, isDeleting, isSettingQuantity } =
    state
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const tCatalog = useTranslations("catalog")
  const {
    availability,
    imageSrc,
    itemProduct,
    price,
    productHref,
    productTitle,
    quantity,
  } = resolveProductListItemPresentation(
    item,
    product,
    tCatalog("product_card.price_on_request"),
  )
  const availabilityLabel = resolveAvailabilityLabel(availability, tAuth)
  const { canAddToCart } = availability
  const availabilityBadgeId = useId()

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
        {item.variant?.title !== undefined && item.variant.title !== "" ? (
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
          {price === null ? null : (
            <span className="font-semibold">{price.currentLabel}</span>
          )}
          {availabilityLabel === null ? null : (
            <Badge
              id={availabilityBadgeId}
              size="sm"
              variant={availability.badgeVariant}
            >
              {availabilityLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-300">
        {canChangeQuantity ? (
          <ProductListQuantityInput
            isSettingQuantity={isSettingQuantity}
            item={item}
            key={`${item.id ?? "missing-item-id"}-${quantity}`}
            onQuantitySet={onQuantitySet}
            productTitle={productTitle}
            quantity={quantity}
          />
        ) : null}
        <Button
          aria-describedby={
            availabilityLabel === null ? undefined : availabilityBadgeId
          }
          disabled={!canAddToCart}
          icon="token-icon-cart"
          isLoading={isAddingToCart}
          loadingText={tCart("adding_to_cart")}
          onClick={() => {
            if (itemProduct !== null) {
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
          disabled={item.id === undefined || item.id === "" || isDeleting}
          icon="token-icon-trash"
          iconSize="md"
          isLoading={isDeleting}
          loadingText={tAuth("product_lists.item.removing")}
          onClick={() => {
            onDelete(item)
          }}
          size="current"
          theme="unstyled"
          variant="danger"
        />
      </div>
    </article>
  )
}
