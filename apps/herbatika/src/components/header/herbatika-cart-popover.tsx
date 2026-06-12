"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import NextLink from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRemoveLineItem, useUpdateLineItem } from "@/lib/storefront/cart"
import {
  asFiniteNumber,
  resolveCartItemsSubtotalAmount,
  resolveCartTaxAmount,
} from "@/lib/storefront/cart-calculations"
import { resolveCartShippingSubtotalAmount } from "@/lib/storefront/cart-tax-calculations"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { CartItemRow } from "./herbatika-cart-item-row"

type HerbatikaCartPopoverProps = {
  cart: HttpTypes.StoreCart | null | undefined
  cartTotalLabel: string
  currencyCode: "EUR" | "CZK"
  itemCount: number
}

type CartTotalsProps = {
  cartItemsTotalLabel: string
  cartTotalLabel: string
  currencyCode: HerbatikaCartPopoverProps["currencyCode"]
  discountAmount: number | null
  shippingAmount: number | null
  taxAmount: number
}

function CartTotals({
  cartItemsTotalLabel,
  cartTotalLabel,
  currencyCode,
  discountAmount,
  shippingAmount,
  taxAmount,
}: CartTotalsProps) {
  return (
    <div className="space-y-150 border-border-secondary border-t pt-250">
      <div className="flex items-center justify-between gap-200">
        <span className="text-fg-secondary">Cena produktov bez DPH:</span>
        <span>{cartItemsTotalLabel}</span>
      </div>

      {shippingAmount !== null && shippingAmount > 0 ? (
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">Doprava bez DPH:</span>
          <span>{formatCurrencyAmount(shippingAmount, currencyCode)}</span>
        </div>
      ) : null}

      {taxAmount > 0 ? (
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">DPH:</span>
          <span>{formatCurrencyAmount(taxAmount, currencyCode)}</span>
        </div>
      ) : null}

      {discountAmount !== null && discountAmount > 0 ? (
        <div className="flex items-center justify-between gap-200 text-success">
          <span>Zľava:</span>
          <span>-{formatCurrencyAmount(discountAmount, currencyCode)}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-200 border-border-secondary border-t pt-200 font-bold text-lg">
        <span>Spolu s DPH:</span>
        <span>{cartTotalLabel}</span>
      </div>
    </div>
  )
}

function EmptyCartPreview() {
  return (
    <output className="flex flex-col items-center gap-200 py-400 text-center">
      <span aria-hidden="true" className="grid place-items-center text-primary">
        <Icon className="text-icon-cart" icon="token-icon-cart" />
      </span>
      <div className="space-y-50">
        <p className="font-semibold text-fg-primary">Váš košík je prázdny</p>
        <p className="text-fg-secondary text-sm">
          Produkty môžete pridať z katalógu.
        </p>
      </div>
    </output>
  )
}

export function HerbatikaCartPopover({
  cart,
  cartTotalLabel,
  currencyCode,
  itemCount,
}: HerbatikaCartPopoverProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const updateLineItemMutation = useUpdateLineItem()
  const removeLineItemMutation = useRemoveLineItem()
  const cartItems = cart?.items ?? []
  const cartItemsTotalLabel = formatCurrencyAmount(
    resolveCartItemsSubtotalAmount(cart),
    currencyCode
  )
  const shippingAmount =
    asFiniteNumber(cart?.shipping_total) !== null
      ? resolveCartShippingSubtotalAmount(cart)
      : null
  const taxAmount = resolveCartTaxAmount(cart)
  const discountAmount = asFiniteNumber(cart?.discount_total)
  const hiddenItemCount = Math.max(cartItems.length - 4, 0)
  const visibleItems = cartItems.slice(0, 4)
  const isPending =
    updateLineItemMutation.isPending || removeLineItemMutation.isPending

  const clearHoverCloseTimeout = () => {
    if (!hoverCloseTimeoutRef.current) {
      return
    }

    clearTimeout(hoverCloseTimeoutRef.current)
    hoverCloseTimeoutRef.current = null
  }

  const handlePreviewOpen = () => {
    clearHoverCloseTimeout()
    setIsPopoverOpen(true)
  }

  const schedulePreviewClose = () => {
    clearHoverCloseTimeout()
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false)
      hoverCloseTimeoutRef.current = null
    }, 120)
  }

  const handleClose = () => {
    clearHoverCloseTimeout()
    setIsPopoverOpen(false)
  }

  useEffect(
    () => () => {
      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current)
      }
    },
    []
  )

  const handleUpdateQuantity = (lineItemId: string, quantity: number) => {
    if (!cart?.id) {
      return
    }

    setErrorMessage(null)
    updateLineItemMutation.mutate(
      {
        cartId: cart.id,
        lineItemId,
        quantity,
      },
      {
        onError: (error) => {
          setErrorMessage(resolveErrorMessage(error))
        },
      }
    )
  }

  const handleRemove = (lineItemId: string) => {
    if (!cart?.id) {
      return
    }

    setErrorMessage(null)
    removeLineItemMutation.mutate(
      {
        cartId: cart.id,
        lineItemId,
      },
      {
        onError: (error) => {
          setErrorMessage(resolveErrorMessage(error))
        },
      }
    )
  }

  return (
    <Popover.Root
      gutter={10}
      id="herbatika-cart-popover"
      onOpenChange={({ open }) => setIsPopoverOpen(open)}
      open={isPopoverOpen}
      placement="bottom-end"
      portalled={false}
      shadow={false}
    >
      <Popover.Context>
        {(api) => (
          <LinkButton
            {...api.getAnchorProps()}
            as={NextLink}
            className="relative inline-flex items-center gap-250 py-550 text-xl data-[state=open]:bg-button-bg-primary-hover sm:w-36"
            data-state={isPopoverOpen ? "open" : "closed"}
            href="/checkout/kosik"
            onClick={handleClose}
            onMouseEnter={handlePreviewOpen}
            onMouseLeave={schedulePreviewClose}
            size="md"
            theme="solid"
            variant="primary"
          >
            <div className="relative">
              <Icon icon="token-icon-cart" size="2xl" />
              <Badge
                className="-top-[7px] -right-200 absolute min-w-500 justify-center rounded-full bg-surface px-100 py-50 text-[11px] text-primary"
                variant="success"
              >
                {itemCount > 99 ? "99+" : String(itemCount)}
              </Badge>
            </div>
            <span className="font-normal font-sans text-md">
              {cartTotalLabel}
            </span>
          </LinkButton>
        )}
      </Popover.Context>

      <Popover.Positioner>
        <Popover.Content
          className="w-[27rem] max-w-[calc(100vw-2rem)] space-y-300"
          onMouseEnter={handlePreviewOpen}
          onMouseLeave={schedulePreviewClose}
        >
          <Popover.Arrow />
          <Popover.Title>
            {itemCount > 0 ? `Košík (${itemCount})` : "Košík"}
          </Popover.Title>
          {visibleItems.length > 0 ? (
            <>
              <div className="space-y-250 overflow-y-auto pt-200 pr-100">
                {visibleItems.map((item) => (
                  <CartItemRow
                    currencyCode={currencyCode}
                    isPending={isPending}
                    item={item}
                    key={item.id}
                    onRemove={handleRemove}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>

              {hiddenItemCount > 0 ? (
                <p className="text-fg-secondary text-xs">{`+ ${hiddenItemCount} ďalších položiek v košíku`}</p>
              ) : null}

              {errorMessage ? (
                <StatusText showIcon status="error">
                  {errorMessage}
                </StatusText>
              ) : null}

              <CartTotals
                cartItemsTotalLabel={cartItemsTotalLabel}
                cartTotalLabel={cartTotalLabel}
                currencyCode={currencyCode}
                discountAmount={discountAmount}
                shippingAmount={shippingAmount}
                taxAmount={taxAmount}
              />

              <div className="space-y-150">
                <LinkButton
                  as={NextLink}
                  block
                  href="/checkout/kosik"
                  onClick={handleClose}
                  size="md"
                  variant="primary"
                >
                  Pokračovať k pokladni
                </LinkButton>
              </div>
            </>
          ) : (
            <EmptyCartPreview />
          )}
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}
