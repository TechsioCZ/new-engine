"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import {
  asFiniteNumber,
  resolveCartItemsSubtotalAmount,
  resolveCartTaxAmount,
} from "@/lib/storefront/cart-calculations"
import { resolveCartShippingSubtotalAmount } from "@/lib/storefront/cart-tax-calculations"
import type { HerbatikaCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { useCartLineItemActions } from "@/lib/storefront/use-cart-line-item-actions"

import { CartItemRow } from "./herbatika-cart-item-row"
import { CartTotals, EmptyCartPreview } from "./herbatika-cart-popover-content"
import { useCartPopoverHover } from "./use-cart-popover-hover"

interface HerbatikaCartPopoverProps {
  cart: HttpTypes.StoreCart | null | undefined
  cartTotalLabel: string
  currencyCode: HerbatikaCurrencyCode
  itemCount: number
}

export const HerbatikaCartPopover = ({
  cart,
  cartTotalLabel,
  currencyCode,
  itemCount,
}: HerbatikaCartPopoverProps) => {
  const t = useTranslations("cart")
  const {
    handleClose,
    handlePreviewOpen,
    isPopoverOpen,
    schedulePreviewClose,
    setIsPopoverOpen,
  } = useCartPopoverHover()
  const cartIdForActions = cart?.id
  const lineItemActions = useCartLineItemActions(
    cartIdForActions === undefined ? {} : { cartId: cartIdForActions },
  )
  const {
    isPending,
    removeItem: handleRemoveItem,
    updateQuantity: handleUpdateQuantity,
  } = lineItemActions
  const cartItems = cart?.items ?? []
  const cartItemsTotalLabel = formatCurrencyAmount(
    resolveCartItemsSubtotalAmount(cart),
    currencyCode,
  )
  const shippingAmount =
    asFiniteNumber(cart?.shipping_total) === null
      ? null
      : resolveCartShippingSubtotalAmount(cart)
  const taxAmount = resolveCartTaxAmount(cart)
  const discountAmount = asFiniteNumber(cart?.discount_total)
  const hiddenItemCount = Math.max(cartItems.length - 4, 0)
  const visibleItems = cartItems.slice(0, 4)

  return (
    <Popover.Root
      gutter={10}
      id="herbatika-cart-popover"
      onOpenChange={({ open }) => {
        setIsPopoverOpen(open)
      }}
      open={isPopoverOpen}
      placement="bottom-end"
      portalled={false}
      shadow={false}
    >
      <Popover.Anchor className="inline-flex">
        <LinkButton
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
              className="-top-cart-badge-offset -right-200 absolute min-w-500 justify-center rounded-full bg-surface px-100 py-50 text-xs text-primary"
              variant="success"
            >
              {itemCount > 99 ? "99+" : String(itemCount)}
            </Badge>
          </div>
          <span className="font-normal font-sans text-md">
            {cartTotalLabel}
          </span>
        </LinkButton>
      </Popover.Anchor>

      <Popover.Positioner>
        <Popover.Content
          className="w-cart-popover max-w-popover-viewport space-y-300"
          onMouseEnter={handlePreviewOpen}
          onMouseLeave={schedulePreviewClose}
        >
          <Popover.Arrow />
          <Popover.Title>
            {itemCount > 0
              ? t("title_with_count", {
                  count: itemCount,
                })
              : t("title")}
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
                    onRemove={handleRemoveItem}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>

              {hiddenItemCount > 0 ? (
                <p className="text-fg-secondary text-xs">
                  {t("additional_items", {
                    count: hiddenItemCount,
                  })}
                </p>
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
                  {t("continue_to_checkout")}
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
