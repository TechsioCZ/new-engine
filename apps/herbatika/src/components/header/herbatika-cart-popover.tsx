"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { useEffect, useRef, useState } from "react"

import NextLink from "@/components/app-link"
import { useAppToast } from "@/hooks/use-app-toast"
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
import { CartTotals, EmptyCartPreview } from "./herbatika-cart-popover-content"

type HerbatikaCartPopoverProps = {
  cart: HttpTypes.StoreCart | null | undefined
  cartTotalLabel: string
  currencyCode: "EUR" | "CZK"
  itemCount: number
}

export function HerbatikaCartPopover({
  cart,
  cartTotalLabel,
  currencyCode,
  itemCount,
}: HerbatikaCartPopoverProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const toast = useAppToast()
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

    updateLineItemMutation.mutate(
      {
        cartId: cart.id,
        lineItemId,
        quantity,
      },
      {
        onError: (error) => {
          toast.error({
            title: resolveErrorMessage(error, "Úprava košíka zlyhala."),
          })
        },
      }
    )
  }

  const handleRemove = (lineItemId: string) => {
    if (!cart?.id) {
      return
    }

    removeLineItemMutation.mutate(
      {
        cartId: cart.id,
        lineItemId,
      },
      {
        onError: (error) => {
          toast.error({
            title: resolveErrorMessage(error, "Odstránenie položky zlyhalo."),
          })
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
            className="relative inline-flex items-center gap-250 py-550 text-xl data-[state=open]:bg-button-bg-primary-hover sm:w-cart-trigger"
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
                className="-top-cart-badge-offset -right-200 absolute min-w-500 justify-center rounded-full bg-surface px-100 py-50 text-cart-badge text-primary"
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
          className="w-cart-popover max-w-popover-viewport space-y-300"
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
