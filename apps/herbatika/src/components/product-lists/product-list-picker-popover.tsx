"use client"

import { Popover } from "@techsio/ui-kit/molecules/popover"
import { useTranslations } from "next-intl"

import type { Product } from "@/components/product-detail/product-detail.types"

import { ProductListPickerContent } from "./product-list-picker-content"
import { useProductListPicker } from "./use-product-list-picker"

interface ProductListPickerPopoverProps {
  product: Product
  quantity: number
  selectedVariantId: string | null
}

export const ProductListPickerPopover = ({
  product,
  quantity,
  selectedVariantId,
}: ProductListPickerPopoverProps) => {
  const tAuth = useTranslations("auth")
  const picker = useProductListPicker({
    product,
    quantity,
    selectedVariantId,
  })

  return (
    <Popover.Root
      border
      gutter={10}
      id="product-list-picker"
      onOpenChange={({ open }) => {
        picker.setIsOpen(open)
      }}
      open={picker.isOpen}
      portalled={false}
      size="sm"
    >
      <Popover.Trigger
        aria-label={tAuth("product_lists.picker.trigger_aria")}
        className="h-750 min-h-750 w-750 min-w-750 p-0 text-fg-secondary hover:bg-transparent hover:text-fg-primary hover:text-primary sm:h-600 sm:min-h-600 sm:w-600 sm:min-w-600"
        icon="token-icon-heart"
        iconSize="2xl"
        size="sm"
        theme="borderless"
        variant="secondary"
      />

      <Popover.Positioner>
        <Popover.Content className="w-950 max-w-full p-0">
          <Popover.Arrow />
          <div className="border-border-secondary border-b px-350 py-300">
            <Popover.Title className="mb-0 text-sm">
              {tAuth("product_lists.picker.title")}
            </Popover.Title>
          </div>
          <ProductListPickerContent picker={picker} />
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}
