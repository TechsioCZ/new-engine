"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import { useState } from "react"

import { useCart } from "@/hooks/use-cart"
import { truncateProductTitle } from "@/lib/order-utils"
import type { Product } from "@/types/product"
import { formatPrice } from "@/utils/price-utils"

interface AddToCartDialogProps {
  product: Product
  open: boolean
  onOpenChange: (details: { open: boolean }) => void
}

export const AddToCartDialog = ({
  product,
  open,
  onOpenChange,
}: AddToCartDialogProps) => {
  const { addItem, addItemMutation } = useCart()
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")

  const variants = product.variants ?? []

  const variantOptions = variants.map((variant) => {
    const optionName = variant.options
      ?.map((option) => option.value)
      .join(" / ")
    const variantName =
      optionName === undefined || optionName === "" ? variant.title : optionName

    const price =
      variant.calculated_price === undefined
        ? ""
        : formatPrice(
            variant.calculated_price.calculated_amount ?? 0,
            variant.calculated_price.currency_code ?? undefined,
          )

    return {
      label: `${variantName}${price === "" ? "" : " - "}${price}`,
      value: variant.id,
    }
  })

  const handleAddToCart = () => {
    if (selectedVariantId === "") {
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
            disabled={selectedVariantId === "" || addItemMutation.isPending}
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
              const [value] = details.value
              if (value !== undefined) {
                setSelectedVariantId(value)
              }
            }}
            placeholder="Vyberte variantu..."
            size="sm"
            value={selectedVariantId === "" ? [] : [selectedVariantId]}
          />
        </div>
      </div>
    </Dialog>
  )
}
