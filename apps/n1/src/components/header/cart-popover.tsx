"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import { Suspense } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { cartFlow } from "@/hooks/storefront-preset"
import { CartContent } from "./cart-content"
import { CartEmptyState } from "./cart-empty-state"
import { CartSkeleton } from "./cart-skeleton"
import { useHeaderContext } from "./store/header-context"

export const CartPopover = () => {
  const { toggleCart, setIsCartOpen } = useHeaderContext()

  const handleHover = () => {
    toggleCart()
    setIsCartOpen(true)
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover-only wrapper for popover
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-only wrapper for popover
    <div onMouseEnter={handleHover}>
      <ErrorBoundary
        fallback={<CartPopoverErrorFallback onClose={toggleCart} />}
      >
        <Suspense fallback={<CartPopoverLoadingFallback />}>
          <CartPopoverContent onClose={toggleCart} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

function CartPopoverContent({ onClose }: { onClose: () => void }) {
  const { isCartOpen, toggleCart } = useHeaderContext()
  const { cart, itemCount } = cartFlow.useSuspenseCart()

  return (
    <Popover
      contentClassName="w-sm max-w-mobile-w"
      gutter={12}
      id="cart-popover"
      onOpenChange={toggleCart}
      open={isCartOpen}
      placement="bottom-end"
      portalled={false}
      shadow={false}
      title={itemCount > 0 ? `Košík (${itemCount})` : "Košík"}
      trigger={
        <div className="relative">
          <Icon
            className="text-fg-reverse hover:text-primary"
            icon="icon-[mdi--shopping-cart-outline]"
          />
          {itemCount > 0 && (
            <Badge
              className="-right-2 -top-1 absolute flex size-5 items-center rounded-full bg-primary text-3xs text-fg-primary"
              variant="primary"
            >
              {itemCount > 99 ? "99+" : itemCount.toString()}
            </Badge>
          )}
        </div>
      }
      triggerClassName="text-3xl px-0 py-0 hover:bg-transparent"
    >
      <CartContent cart={cart} onClose={onClose} />
    </Popover>
  )
}

function CartPopoverLoadingFallback() {
  const { isCartOpen, toggleCart } = useHeaderContext()

  return (
    <Popover
      contentClassName="w-sm max-w-mobile-w"
      gutter={12}
      id="cart-popover"
      onOpenChange={toggleCart}
      open={isCartOpen}
      placement="bottom-end"
      portalled={false}
      shadow={false}
      title="Košík"
      trigger={
        <div className="relative">
          <Icon
            className="text-fg-reverse hover:text-primary"
            icon="icon-[mdi--shopping-cart-outline]"
          />
        </div>
      }
      triggerClassName="text-3xl px-0 py-0 hover:bg-transparent"
    >
      <CartSkeleton />
    </Popover>
  )
}

function CartPopoverErrorFallback({ onClose }: { onClose: () => void }) {
  const { isCartOpen, toggleCart } = useHeaderContext()

  return (
    <Popover
      contentClassName="w-sm max-w-mobile-w"
      gutter={12}
      id="cart-popover"
      onOpenChange={toggleCart}
      open={isCartOpen}
      placement="bottom-end"
      portalled={false}
      shadow={false}
      title="Košík"
      trigger={
        <div className="relative">
          <Icon
            className="text-fg-reverse hover:text-primary"
            icon="icon-[mdi--shopping-cart-outline]"
          />
        </div>
      }
      triggerClassName="text-3xl px-0 py-0 hover:bg-transparent"
    >
      <CartEmptyState onContinueShopping={onClose} />
    </Popover>
  )
}
