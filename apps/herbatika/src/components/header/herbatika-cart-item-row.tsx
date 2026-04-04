"use client"

import type { HttpTypes } from "@medusajs/types"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import Image from "next/image"
import NextLink from "next/link"
import { useEffect, useState } from "react"
import {
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemUnitAmount,
} from "@/lib/storefront/cart-calculations"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
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
  const baseQuantity = resolveLineItemQuantity(item)
  const [localQuantity, setLocalQuantity] = useState(baseQuantity)
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

  useEffect(() => {
    setLocalQuantity(baseQuantity)
  }, [baseQuantity])

  useEffect(() => {
    if (localQuantity === baseQuantity) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onUpdateQuantity(item.id, localQuantity)
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [baseQuantity, item.id, localQuantity, onUpdateQuantity])

  const handleQuantityChange = (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      return
    }

    const normalizedQuantity = Math.max(
      1,
      Math.min(Math.round(nextQuantity), itemMaxQuantity)
    )
    setLocalQuantity(normalizedQuantity)
  }

  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-start gap-200">
      <Image
        alt={itemName}
        className="h-10 w-10 rounded-md border border-border-secondary object-cover"
        height={60}
        src={resolveLineItemThumbnail(item)}
        width={60}
      />

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
          <p className="text-danger text-xs">{`Zbývá pouze ${itemInventory} ks`}</p>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-150">
        <NumericInput
          allowOverflow={false}
          className="w-20"
          max={itemMaxQuantity}
          min={1}
          onChange={handleQuantityChange}
          size="md"
          value={localQuantity}
        >
          <NumericInput.Control>
            <NumericInput.DecrementTrigger
              disabled={isPending || localQuantity <= 1}
            />
            <NumericInput.Input
              aria-label={`Množstvo pre ${itemName}`}
              className="text-center"
            />
            <NumericInput.IncrementTrigger
              disabled={isPending || localQuantity >= itemMaxQuantity}
            />
          </NumericInput.Control>
        </NumericInput>

        <Button
          aria-label={`Odstrániť ${itemName} z košíka`}
          className="h-650 w-650 p-0 text-fg-secondary hover:text-fg-primary"
          disabled={isPending}
          icon="icon-[mdi--trash-can-outline]"
          onClick={() => onRemove(item.id)}
          size="sm"
          theme="unstyled"
          variant="secondary"
        />
      </div>
    </article>
  )
}
