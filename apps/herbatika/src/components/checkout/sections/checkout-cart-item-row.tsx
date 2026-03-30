"use client"

import type { HttpTypes } from "@medusajs/types"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Image } from "@techsio/ui-kit/atoms/image"
import { Link } from "@techsio/ui-kit/atoms/link"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import NextLink from "next/link"
import { useEffect, useMemo, useState } from "react"
import { resolveCartItemName } from "@/components/checkout/checkout.utils"
import {
  FALLBACK_MAX_QUANTITY,
  resolveLineItemHref,
  resolveLineItemInventory,
  resolveLineItemThumbnail,
} from "@/components/header/herbatika-cart-item.utils"
import {
  asFiniteNumber,
  resolveLineItemQuantity,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

type CheckoutCartItemRowProps = {
  currencyCode: "EUR" | "CZK"
  isPending: boolean
  item: HttpTypes.StoreCartLineItem
  onRemove: (lineItemId: string) => void
  onUpdateQuantity: (lineItemId: string, quantity: number) => void
}

const toSkDate = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, "0")
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const year = date.getFullYear()

  return `${day}.${month}.${year}`
}

const addBusinessDays = (start: Date, daysToAdd: number) => {
  const date = new Date(start)
  let remainingDays = daysToAdd

  while (remainingDays > 0) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays -= 1
    }
  }

  return date
}

const resolveFallbackDeliveryLabel = () => {
  const deliveryDate = addBusinessDays(new Date(), 3)
  return `u Vás do ${toSkDate(deliveryDate)}`
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const resolveOriginalLineItemTotalAmount = (
  item: HttpTypes.StoreCartLineItem
) => {
  const itemRecord = item as unknown as Record<string, unknown>
  const compareAtUnit = asFiniteNumber(itemRecord.compare_at_unit_price)
  if (compareAtUnit === null) {
    return null
  }

  return compareAtUnit * resolveLineItemQuantity(item)
}

const resolveAvailabilityText = (item: HttpTypes.StoreCartLineItem) => {
  const metadata = asRecord(
    (item as unknown as Record<string, unknown>).metadata
  )
  const topOffer = asRecord(metadata?.top_offer)
  const stock = asRecord(topOffer?.stock)
  const stockAmount =
    asFiniteNumber(stock?.amount) ?? resolveLineItemInventory(item)
  const isInStock = stockAmount === null ? true : stockAmount > 0

  if (!isInStock) {
    return (
      asString(topOffer?.availability_out_of_stock) ??
      "Momentálne nie je skladom"
    )
  }

  const availabilityLabel =
    asString(topOffer?.availability_in_stock) ?? "Na sklade"
  const deliveryLabel =
    asString(topOffer?.delivery_label) ?? resolveFallbackDeliveryLabel()
  return `${availabilityLabel}, ${deliveryLabel}`
}

export function CheckoutCartItemRow({
  currencyCode,
  isPending,
  item,
  onRemove,
  onUpdateQuantity,
}: CheckoutCartItemRowProps) {
  const baseQuantity = resolveLineItemQuantity(item)
  const [localQuantity, setLocalQuantity] = useState(baseQuantity)
  const itemName = resolveCartItemName(item)
  const itemHref = resolveLineItemHref(item)
  const itemInventory = resolveLineItemInventory(item)
  const itemMaxQuantity = Math.max(
    baseQuantity,
    itemInventory ?? FALLBACK_MAX_QUANTITY
  )
  const currentLineAmount = resolveLineItemTotalAmount(item)
  const originalLineAmount = useMemo(
    () => resolveOriginalLineItemTotalAmount(item),
    [item]
  )
  const shouldShowOriginalAmount =
    typeof originalLineAmount === "number" &&
    originalLineAmount > currentLineAmount + 0.001
  const availabilityText = resolveAvailabilityText(item)

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
    <article className="grid grid-cols-12 items-start gap-200">
      <Link
        as={NextLink}
        className="col-span-3 inline-flex h-750 w-750 md:col-span-2"
        href={itemHref}
      >
        <Image
          alt={itemName}
          className="h-750 w-750 object-cover"
          src={resolveLineItemThumbnail(item)}
        />
      </Link>

      <div className="col-span-9 min-w-0 pt-100 md:col-span-5">
        <Link
          as={NextLink}
          className="line-clamp-3 font-normal text-fg-primary text-md leading-snug no-underline hover:text-fg-primary"
          href={itemHref}
        >
          {itemName}
        </Link>

        <p className="mt-500 inline-flex items-center gap-150 font-medium text-primary text-xs leading-normal">
          <Icon className="text-md" icon="icon-[mdi--check]" />
          <span>{availabilityText}</span>
        </p>
      </div>
      <NumericInput
        allowOverflow={false}
        className="w-32"
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

      <div className="col-span-6 mt-200 flex items-center justify-end gap-150 md:col-span-3 md:mt-0 md:min-h-750 md:flex-col md:items-end md:justify-start md:gap-100">
        {shouldShowOriginalAmount ? (
          <p className="font-light text-fg-secondary text-sm leading-tight line-through">
            {formatCurrencyAmount(originalLineAmount, currencyCode)}
          </p>
        ) : (
          <span />
        )}
        <p className="font-bold text-fg-primary text-xl leading-tight">
          {formatCurrencyAmount(currentLineAmount, currencyCode)}
        </p>
        <Button
          aria-label={`Odstrániť ${itemName} z košíka`}
          className="h-650 w-650 p-150 text-fg-secondary hover:text-fg-primary md:mt-auto"
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
