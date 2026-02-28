"use client"

import { Badge, type BadgeProps } from "@ui/atoms/badge"
import { Button } from "@ui/atoms/button"
import { Label } from "@ui/atoms/label"
import { Rating } from "@ui/atoms/rating"
import { useToast } from "@ui/molecules/toast"
import { NumericInputTemplate } from "@ui/templates/numeric-input"
import { tv } from "@techsio/ui-kit/utils"
import { useState } from "react"
import { SafeHtmlContent } from "@/components/safe-html-content"
import { useCart } from "@/hooks/use-cart"
import type { Product, ProductVariant } from "@/types/product"
import { isVariantInStock, sortVariantsBySize } from "@/utils/variant-utils"

interface ProductInfoProps {
  product: Product
  selectedVariant: ProductVariant | null
  badges: BadgeProps[]
  price: string | number
  priceWithTax?: string | number
  onVariantChange: (variant: ProductVariant) => void
}

const variantButtonStyles = tv({
  slots: {
    button: ["roundend-product-btn", "border"],
  },
  variants: {
    isSelected: {
      true: {
        button: "border-primary",
      },
      false: {
        button: "border-border-subtle",
      },
    },
    isInStock: {
      true: {},
      false: {
        button: "cursor-not-allowed opacity-50",
      },
    },
  },
})

export function ProductInfo({
  product,
  selectedVariant,
  badges,
  price,
  priceWithTax,
  onVariantChange,
}: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()
  const toast = useToast()
  const productVariants = product.variants || []

  const validQuantity =
    typeof quantity === "number" && !Number.isNaN(quantity) ? quantity : 1
  const normalizedQuantity = Math.max(
    1,
    Math.min(10, Math.trunc(validQuantity))
  )

  const handleQuantityChange = (nextQuantity: number) => {
    if (typeof nextQuantity !== "number" || Number.isNaN(nextQuantity)) {
      setQuantity(1)
      return
    }

    setQuantity(Math.max(1, Math.min(10, Math.trunc(nextQuantity))))
  }

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.create({
        title: "Vyberte prosím možnosti",
        description: "Před přidáním do košíku vyberte variantu produktu.",
        type: "error",
      })
      return
    }

    if (!isVariantInStock(selectedVariant)) {
      toast.create({
        title: "Varianta není skladem",
        description: "Vyberte prosím jinou velikost.",
        type: "error",
      })
      return
    }

    addItem(selectedVariant.id, normalizedQuantity)
  }

  return (
    <div className="flex flex-col">
      {badges.length > 0 && (
        <div className="mb-product-info-badge-margin flex flex-wrap gap-product-info-badge-gap">
          {badges.map((badge, idx) => (
            <Badge key={`badge-${badge.variant}-${idx}`} {...badge} />
          ))}
        </div>
      )}

      <h1 className="mb-product-info-title-margin font-product-info-title text-product-info-title-size">
        {product.title}
      </h1>

      {product.rating && (
        <div className="mb-product-info-rating-margin flex items-center gap-product-info-rating-gap">
          <Rating readOnly value={product.rating} />
          <span className="text-product-info-rating-text">
            ({product.reviewCount || 0} recenzí)
          </span>
        </div>
      )}

      <SafeHtmlContent
        className="mb-product-info-description-margin text-product-info-description"
        content={product.description}
      />

      {productVariants.length > 1 && (
        <div className="mb-product-info-variant-margin">
          <Label className="mb-product-info-variant-label-margin font-medium text-md">
            Vyberte velikost
          </Label>

          <div className="flex flex-wrap gap-100">
            {sortVariantsBySize(productVariants).map((variant) => {
              const isSelected = selectedVariant?.id === variant.id
              const isInStock = isVariantInStock(variant)
              const { button } = variantButtonStyles({
                isSelected,
                isInStock,
              })

              return (
                <Button
                  className={button()}
                  disabled={!isInStock}
                  key={variant.id}
                  onClick={() => {
                    if (isInStock) {
                      onVariantChange(variant)
                    }
                  }}
                  size="sm"
                  theme={isSelected ? "solid" : "borderless"}
                >
                  {variant.title}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-product-info-price-margin flex flex-col gap-100">
        {!!priceWithTax && (
          <span className="font-product-info-price text-product-info-price-size">
            {priceWithTax}
          </span>
        )}
        <span className="text-fg-secondary text-sm">bez DPH {price}</span>
      </div>

      <div className="mb-product-info-action-margin flex gap-product-info-action-gap">
        <Button
          className="items-center"
          icon="icon-[mdi--cart-plus]"
          onClick={handleAddToCart}
          size="sm"
          variant="primary"
        >
          Přidat do košíku
        </Button>{" "}
        <NumericInputTemplate
          className="h-fit w-24 py-0"
          max={10}
          min={1}
          onChange={handleQuantityChange}
          size="sm"
          value={normalizedQuantity}
        />
        <Button icon="icon-[mdi--heart-outline]" size="sm" variant="secondary">
          <span className="sr-only">Přidat do seznamu přání</span>
        </Button>
      </div>
    </div>
  )
}
