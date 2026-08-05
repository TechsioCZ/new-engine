"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { slugify } from "@techsio/ui-kit/utils"
import { useState } from "react"

import { useAddToCart, useCart } from "@/hooks/use-cart"
import { useRegion } from "@/hooks/use-region"
import { useCartToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/providers/analytics-provider"
import type { ProductDetail, ProductVariantDetail } from "@/types/product"
import { validateAddToCart } from "@/utils/cart/cart-validation"

export const AddToCartSection = ({
  selectedVariant,
  detail,
}: {
  selectedVariant: ProductVariantDetail
  detail: ProductDetail
}) => {
  const [quantity, setQuantity] = useState(1)
  const { mutate: addToCart, isPending } = useAddToCart()
  const { cart } = useCart()
  const { regionId } = useRegion()
  const toast = useCartToast()
  const analytics = useAnalytics()

  const handleAddToCart = () => {
    // Validate region context
    if (!regionId) {
      toast.cartError("Nelze přidat do košíku bez regionálního kontextu")
      return
    }

    // Validate variant selection
    if (!selectedVariant?.id) {
      toast.cartError("Žádná varianta není vybrána")
      return
    }

    // Validate stock availability (checks current cart + new quantity)
    const validation = validateAddToCart({
      cart,
      quantity,
      variantId: selectedVariant.id,
      ...(selectedVariant.inventory_quantity === undefined
        ? {}
        : { inventoryQuantity: selectedVariant.inventory_quantity }),
    })

    if (!validation.valid) {
      toast.stockWarningWithDetails(
        validation.availableQuantity,
        validation.requestedTotal,
      )
      return
    }

    addToCart(
      {
        autoCreateCart: true,
        metadata: {
          inventory_quantity: selectedVariant.inventory_quantity ?? 0,
        },
        quantity,
        variantId: selectedVariant.id,
      },
      {
        onError: (error) => {
          if (error.message?.includes("stock")) {
            toast.stockWarning()
          } else if (error.message?.includes("network")) {
            toast.networkError()
          } else {
            toast.cartError(error.message)
          }
        },
        onSuccess: () => {
          const currency = (
            selectedVariant.calculated_price?.currency_code ?? "CZK"
          ).toUpperCase()
          const price =
            selectedVariant.calculated_price?.calculated_amount_with_tax ?? 0

          // Unified analytics - AddToCart tracking (sends to Meta, Google, Leadhub)
          analytics.trackAddToCart({
            currency,
            productId: selectedVariant.id,
            productName: detail.title,
            quantity,
            value: price * quantity,
          })

          // Leadhub-specific - SetCart tracking for cart state sync
          analytics.trackSetCart({
            products: [
              {
                currency,
                product_id: selectedVariant.id,
                quantity,
                value: price,
              },
            ],
          })

          toast.addedToCart(detail.title, quantity)
          // Reset quantity after successful add
          setQuantity(1)

          // Dispatch event to open cart popover (optional)
          const event = new CustomEvent("open-cart")
          window.dispatchEvent(event)
        },
      },
    )
  }

  const maxQuantity = selectedVariant?.inventory_quantity ?? 99
  return (
    <div className="flex gap-200">
      <NumericInput
        allowMouseWheel={true}
        allowOverflow={false}
        defaultValue={1}
        disabled={isPending}
        id={`${slugify(detail.title)}-number-input`}
        max={maxQuantity}
        min={1}
        onChange={setQuantity}
        value={quantity}
      >
        <NumericInput.DecrementTrigger />
        <NumericInput.Control className="w-900">
          <NumericInput.Input />
        </NumericInput.Control>
        <NumericInput.IncrementTrigger />
      </NumericInput>
      <Button
        disabled={(isPending ?? !selectedVariant?.id) || !regionId}
        onClick={handleAddToCart}
        variant="secondary"
      >
        {isPending ? "Přidávám..." : "Přidat do košíku"}
      </Button>
    </div>
  )
}
