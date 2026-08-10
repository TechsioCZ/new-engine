"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useId } from "react"

import NextLink from "@/components/app-link"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"

import { resolveProductListItemPresentation } from "./account-product-list-item-presentation"
import type { ProductListItemAvailability } from "./product-list-availability"
import { ProductListQuantityInput } from "./product-list-quantity-input"

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

const resolveAvailabilityLabel = (
  availability: ProductListItemAvailability,
  translate: ReturnType<typeof useTranslations<"auth">>,
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
  const presentation = resolveProductListItemPresentation(
    item,
    product,
    tCatalog("product_card.price_on_request"),
  )
  const availabilityLabel = resolveAvailabilityLabel(
    presentation.availability,
    tAuth,
  )
  const availabilityBadgeId = useId()

  return (
    <article className="flex flex-col gap-300 border-border-secondary border-b bg-base p-300 md:flex-row md:items-center">
      <NextLink className="shrink-0" href={presentation.productHref}>
        <Image
          alt={presentation.productTitle}
          className="h-850 w-850 rounded-md object-contain"
          height={80}
          src={presentation.imageSrc}
          width={80}
        />
      </NextLink>

      <div className="min-w-0 flex-1 space-y-100">
        <Link
          as={NextLink}
          className="block truncate font-semibold text-primary text-sm underline"
          href={presentation.productHref}
        >
          {presentation.productTitle}
        </Link>
        {item.variant?.title !== undefined && item.variant.title !== "" ? (
          <p className="truncate text-fg-secondary text-xs">
            {item.variant.title}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-300 gap-y-100 text-sm">
          {canChangeQuantity ? null : (
            <span className="text-fg-secondary">
              {tAuth("product_lists.item.quantity", {
                quantity: presentation.quantity,
              })}
            </span>
          )}
          {presentation.price === null ? null : (
            <span className="font-semibold">
              {presentation.price.currentLabel}
            </span>
          )}
          {availabilityLabel === null ? null : (
            <Badge
              id={availabilityBadgeId}
              size="sm"
              variant={presentation.availability.badgeVariant}
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
            key={`${item.id ?? "missing-item-id"}-${presentation.quantity}`}
            onQuantitySet={onQuantitySet}
            productTitle={presentation.productTitle}
            quantity={presentation.quantity}
          />
        ) : null}
        <Button
          aria-describedby={
            availabilityLabel === null ? undefined : availabilityBadgeId
          }
          disabled={!presentation.availability.canAddToCart}
          icon="token-icon-cart"
          isLoading={isAddingToCart}
          loadingText={tCart("adding_to_cart")}
          onClick={() => {
            if (presentation.itemProduct !== null) {
              onAddToCart(item, presentation.itemProduct)
            }
          }}
          size="sm"
          variant="primary"
        >
          {tCart("add_to_cart")}
        </Button>
        <Button
          aria-label={tAuth("product_lists.item.remove_aria", {
            productName: presentation.productTitle,
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
