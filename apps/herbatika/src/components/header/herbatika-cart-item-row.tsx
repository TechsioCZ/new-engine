"use client"

import type { HttpTypes } from "@medusajs/types"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import Image from "next/image"
import NextLink from "next/link"
import { CartLineItemQuantityInput } from "@/components/cart/cart-line-item-quantity-input"
import {
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemUnitAmount,
} from "@/lib/storefront/cart-calculations"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { formatStorefrontText } from "@/lib/storefront/storefront-texts"
import { useCartStorefrontTexts } from "@/lib/storefront/use-cart-storefront-texts"
import {
  FALLBACK_MAX_QUANTITY,
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemThumbnail,
} from "./herbatika-cart-item.utils"

type CartItemRowProps = {
  currencyCode: "EUR" | "CZK"
  isPending: boolean
  item: HttpTypes.StoreCartLineItem
  onRemove: (lineItemId: string) => void
  onUpdateQuantity: (lineItemId: string, quantity: number) => void
}

export function CartItemRow({
  currencyCode,
  isPending,
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemRowProps) {
  const cartTexts = useCartStorefrontTexts()
  const baseQuantity = resolveLineItemQuantity(item)
  const itemName = resolveCartItemName(item)
  const itemHref = resolveLineItemHref(item)
  const itemVariant = item.variant_title
  const itemInventory = resolveLineItemInventory(item)
  const itemMaxQuantity = Math.max(
    baseQuantity,
    itemInventory ?? FALLBACK_MAX_QUANTITY
  )
  const itemUnitAmountLabel = formatCurrencyAmount(
    resolveLineItemUnitAmount(item),
    currencyCode
  )

  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-start gap-200">
      <NextLink href={itemHref}>
        <Image
          alt={itemName}
          className="h-16 w-16 rounded-md object-cover"
          height={60}
          src={resolveLineItemThumbnail(item)}
          width={60}
        />
      </NextLink>

      <div className="min-w-0">
        <Link
          as={NextLink}
          className="block truncate font-semibold text-sm underline"
          href={itemHref}
        >
          {itemName}
        </Link>

        {itemVariant && itemVariant !== "Default" ? (
          <p className="truncate text-fg-secondary text-xs">{itemVariant}</p>
        ) : null}

        <p className="font-semibold text-sm">{itemUnitAmountLabel}</p>

        {itemInventory !== null && itemInventory > 0 && itemInventory <= 2 ? (
          <p className="text-danger text-xs">
            {formatStorefrontText(cartTexts.lowStock, {
              quantity: itemInventory,
            })}
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-150">
        <CartLineItemQuantityInput
          className="w-24"
          inputClassName="text-center"
          isPending={isPending}
          itemName={itemName}
          lineItemId={item.id}
          maxQuantity={itemMaxQuantity}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
          quantity={baseQuantity}
        />

        <Button
          aria-label={formatStorefrontText(cartTexts.removeItemAria, {
            itemName,
          })}
          className="h-650 w-650 p-0 text-fg-secondary hover:text-fg-primary"
          disabled={isPending}
          icon="token-icon-trash"
          onClick={() => onRemove(item.id)}
          size="sm"
          theme="unstyled"
          variant="secondary"
        />
      </div>
    </article>
  )
}
