"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"
import { useRemoveLineItem, useUpdateLineItem } from "@/hooks/use-cart"
import { useCartToast } from "@/hooks/use-toast"
import type { Cart } from "@/types/cart"
import { getOptimisticFlag } from "@/utils/cart/cart-helpers"
import { formatAmount } from "@/utils/format/format-product"
import { CartEmptyState } from "./cart-empty-state"
import { CartItem } from "./cart-item"

type CartContentProps = {
  cart: Cart | null | undefined
  onClose?: () => void
}

export const CartContent = ({ cart, onClose }: CartContentProps) => {
  const { mutate: updateQuantity, isPending: isUpdating } = useUpdateLineItem()
  const { mutate: removeItem, isPending: isRemoving } = useRemoveLineItem()
  const toast = useCartToast()

  const handleUpdateQuantity = (itemId: string) => (quantity: number) => {
    if (!cart) {
      return
    }

    updateQuantity(
      {
        cartId: cart.id,
        lineItemId: itemId,
        quantity,
      },
      {
        onError: (error) => {
          toast.cartError(error.message)
        },
      }
    )
  }

  const handleRemoveItem = (itemId: string, itemTitle: string) => () => {
    if (!cart) {
      return
    }

    removeItem(
      {
        cartId: cart.id,
        lineItemId: itemId,
      },
      {
        onSuccess: () => {
          toast.removedFromCart(itemTitle)
        },
        onError: (error) => {
          toast.cartError(error.message)
        },
      }
    )
  }

  if (!cart?.items || cart.items.length === 0) {
    return <CartEmptyState onContinueShopping={onClose} />
  }

  const isPending = isUpdating || isRemoving
  const isOptimistic = getOptimisticFlag(cart)

  return (
    <div className="flex flex-col gap-400">
      <div className="max-h-sm divide-y divide-border-secondary overflow-y-auto">
        {cart.items.map((item) => {
          const itemTitle = item.product_title || item.title || "Product"
          const itemOptimistic = getOptimisticFlag(item)

          return (
            <CartItem
              isOptimistic={isOptimistic || itemOptimistic}
              isPending={isPending}
              item={item}
              key={item.id}
              onRemove={handleRemoveItem(item.id, itemTitle)}
              onUpdateQuantity={handleUpdateQuantity(item.id)}
            />
          )
        })}
      </div>

      <div className="border-border-secondary border-t pt-400">
        <div className="space-y-200">
          <div className="flex justify-between text-sm">
            <span className="text-fg-secondary">Mezisoučet:</span>
            <span>{formatAmount(cart.subtotal)}</span>
          </div>
          {cart.shipping_total !== undefined && cart.shipping_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-fg-secondary">Doprava:</span>
              <span>{formatAmount(cart.shipping_total)}</span>
            </div>
          )}

          {cart.tax_total !== undefined && cart.tax_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-fg-secondary">DPH:</span>
              <span>{formatAmount(cart.tax_total)}</span>
            </div>
          )}

          {cart.discount_total !== undefined && cart.discount_total > 0 && (
            <div className="flex justify-between text-sm text-success-light">
              <span>Sleva:</span>
              <span>-{formatAmount(cart.discount_total)}</span>
            </div>
          )}

          <div className="flex justify-between border-border-secondary border-t pt-200 font-semibold text-md">
            <span>Celkem:</span>
            <span>{formatAmount(cart.total)}</span>
          </div>

          {cart.subtotal && cart.subtotal < 1500 && (
            <p className="pt-200 text-center text-fg-secondary text-xs">
              Doprava zdarma od 1 500 Kč (zbývá{" "}
              {formatAmount(1500 - cart.subtotal)})
            </p>
          )}
        </div>
      </div>

      <div className="space-y-200">
        <LinkButton
          as={Link}
          className="w-full justify-center text-fg-button"
          href="/pokladna"
          onClick={onClose}
          size="md"
          theme="solid"
          variant="primary"
        >
          Přejít k pokladně
        </LinkButton>

        <Button
          className="w-full justify-center"
          onClick={onClose}
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          Pokračovat v nákupu
        </Button>
      </div>
    </div>
  )
}
