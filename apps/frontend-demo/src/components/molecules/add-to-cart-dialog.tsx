"use client"

import { Button } from "@ui/atoms/button"
import { Dialog } from "@ui/molecules/dialog"
import { SelectTemplate } from "@ui/templates/select"
import { useState } from "react"
import { useCart } from "@/hooks/use-cart"
import { truncateProductTitle } from "@/lib/order-utils"
import type { Product, ProductVariant } from "@/types/product"
import { formatPrice } from "@/utils/price-utils"

interface AddToCartDialogProps {
  product: Product
  open: boolean
  onOpenChange: (details: { open: boolean }) => void
}

const getVariantName = (variant: ProductVariant) => {
  const optionValues =
    variant.options
      ?.map((option) => option.value)
      .filter((value): value is string => Boolean(value)) || []

  if (optionValues.length > 0) {
    return optionValues.join(" / ")
  }

  return variant.title || "Varianta"
}

export function AddToCartDialog({
  product,
  open,
  onOpenChange,
}: AddToCartDialogProps) {
  const { addItem, addItemMutation } = useCart()
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")

  const variants = product.variants || []

  const variantOptions = variants.map((variant) => {
    const variantName = getVariantName(variant)

    const price = variant.calculated_price
      ? formatPrice(
          variant.calculated_price.calculated_amount || 0,
          variant.calculated_price.currency_code ?? undefined
        )
      : ""

    return {
      value: variant.id,
      label: `${variantName}${price ? ` - ${price}` : ""}`,
    }
  })

  const handleAddToCart = () => {
    if (!selectedVariantId) {
      return
    }

    addItem(selectedVariantId)

    if (!addItemMutation.isPending) {
      onOpenChange({ open: false })
    }
  }

  const handleClose = () => {
    onOpenChange({ open: false })
    setSelectedVariantId("")
  }

  return (
    <Dialog
      actions={
        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Zrušit
          </Button>
          <Button
            disabled={!selectedVariantId || addItemMutation.isPending}
            isLoading={addItemMutation.isPending}
            onClick={handleAddToCart}
            size="sm"
            variant="primary"
          >
            Přidat do košíku
          </Button>
        </div>
      }
      customTrigger={true}
      description={`Vyberte variantu produktu ${truncateProductTitle(product.title)}`}
      onOpenChange={onOpenChange}
      open={open}
      title="Přidat do košíku"
    >
      <div className="space-y-4">
        <div>
          <SelectTemplate
            className="overflow-hidden"
            items={variantOptions}
            label="Vyberte variantu"
            onValueChange={(details) => {
              const value = details.value[0]
              if (value) {
                setSelectedVariantId(value)
              }
            }}
            placeholder="Vyberte variantu..."
            size="sm"
            value={selectedVariantId ? [selectedVariantId] : []}
          />
        </div>
      </div>
    </Dialog>
  )
}
