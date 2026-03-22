"use client"
import { Badge, type BadgeProps } from "@ui/atoms/badge"
import { Button } from "@ui/atoms/button"
import { Label } from "@ui/atoms/label"
import { Rating } from "@ui/atoms/rating"
import { useToast } from "@ui/molecules/toast"
import { NumericInputTemplate } from "@ui/templates/numeric-input"
import { useState } from "react"
import { SafeHtmlContent } from "@/components/safe-html-content"
import { useCart } from "@/hooks/use-cart"
import { getVariantInventory, isQuantityAvailable } from "@/lib/inventory"
import type { Product, ProductVariant } from "@/types/product"
import { sortVariantsBySize } from "@/utils/variant-utils"

type ProductInfoProps = {
  product: Product
  selectedVariant: ProductVariant | null
  badges: BadgeProps[]
  price: string | number
  priceWithTax?: string | number
  onVariantChange: (variant: ProductVariant) => void
}

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
  const selectedVariantInventory = getVariantInventory(selectedVariant)
  const canAddSelectedVariant = isQuantityAvailable(
    selectedVariant,
    validQuantity
  )

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.create({
        title: "Vyberte prosím možnosti",
        description:
          "Před přidáním do košíku vyberte prosím všechny možnosti produktu.",
        type: "error",
      })
      return
    }

    if (!canAddSelectedVariant) {
      toast.create({
        title: "Vyprodáno",
        description:
          "Vybraná varianta není dostupná v požadovaném množství. Zvolte jinou variantu nebo nižší počet kusů.",
        type: "error",
      })
      return
    }

    addItem(selectedVariant.id, validQuantity)
  }

  return (
    <div className="flex flex-col">
      {/* Badges */}
      {badges.length > 0 && (
        <div className="mb-product-info-badge-margin flex flex-wrap gap-product-info-badge-gap">
          {badges.map((badge, idx) => (
            <Badge key={`badge-${badge.variant}-${idx}`} {...badge} />
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="mb-product-info-title-margin font-product-info-title text-product-info-title-size">
        {product.title}
      </h1>

      {/* Rating */}
      {product.rating && (
        <div className="mb-product-info-rating-margin flex items-center gap-product-info-rating-gap">
          <Rating readOnly value={product.rating} />
          <span className="text-product-info-rating-text">
            ({product.reviewCount || 0} recenzí)
          </span>
        </div>
      )}

      {/* Description */}
      <SafeHtmlContent
        className="mb-product-info-description-margin text-product-info-description"
        content={product.description}
      />

      {/* Variant Selectors */}
      {productVariants.length > 1 && (
        <div className="mb-product-info-variant-margin">
          <Label className="mb-product-info-variant-label-margin font-medium text-md">
            Vyberte Velikost
          </Label>

          {
            /* Size or other option buttons */
            <div className="flex flex-wrap gap-100">
              {sortVariantsBySize(productVariants).map((variant) => {
                const isSelected = selectedVariant?.id === variant.id
                return (
                  <Button
                    className="roundend-product-btn border"
                    key={variant.id}
                    onClick={() => onVariantChange(variant)}
                    size="sm"
                    theme={isSelected ? "solid" : "borderless"}
                  >
                    {variant.title}
                  </Button>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* Price */}
      <div className="mb-product-info-price-margin flex flex-col gap-100">
        {!!priceWithTax && (
          <span className="font-product-info-price text-product-info-price-size">
            {priceWithTax}
          </span>
        )}
        <span className="text-fg-secondary text-sm">bez DPH {price}</span>
      </div>

      {/* Actions */}
      <div className="mb-product-info-action-margin flex gap-product-info-action-gap">
        <Button
          className="items-center"
          disabled={!(selectedVariant && canAddSelectedVariant)}
          icon="icon-[mdi--cart-plus]"
          onClick={handleAddToCart}
          size="sm"
          variant="primary"
        >
          {selectedVariant && selectedVariantInventory.status === "out-of-stock"
            ? "Vyprodáno"
            : "Přidat do košíku"}
        </Button>{" "}
        <NumericInputTemplate
          className="h-fit w-24 py-0"
          max={10}
          min={1}
          onChange={setQuantity}
          size="sm"
          value={validQuantity}
        />
        <Button icon="icon-[mdi--heart-outline]" size="sm" variant="secondary">
          <span className="sr-only">Přidat do seznamu přání</span>
        </Button>
      </div>
    </div>
  )
}
