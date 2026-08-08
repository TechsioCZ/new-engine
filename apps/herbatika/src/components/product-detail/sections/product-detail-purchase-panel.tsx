"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { Select } from "@techsio/ui-kit/molecules/select"
import { useLocale, useTranslations } from "next-intl"

import { ProductDetailPurchasePanelHeader } from "@/components/product-detail/sections/product-detail-purchase-panel-header"
import { ProductDetailPurchasePanelPricing } from "@/components/product-detail/sections/product-detail-purchase-panel-pricing"
import type { ProductDetailPurchasePanelProps } from "@/components/product-detail/sections/product-detail-purchase-panel.types"
import {
  resolveAccessibleProductName,
  resolveDisplayHighlights,
} from "@/components/product-detail/sections/product-detail-purchase-panel.utils"

export const ProductDetailPurchasePanel = ({
  canAddToCart,
  currentAmountLabel,
  displayOriginalLabel,
  isAdding,
  maxQuantity,
  offerState,
  onAddToCart,
  onQuantityChange,
  onVariantChange,
  product,
  productCategories,
  productHighlights,
  quantity,
  selectedVariantId,
  unitPriceLabel,
  variantItems,
  vipCreditLabel,
}: ProductDetailPurchasePanelProps) => {
  const locale = useLocale()
  const tCart = useTranslations("cart")
  const tCatalog = useTranslations("catalog")
  const displayHighlights = resolveDisplayHighlights(productHighlights)
  const accessibleProductName = resolveAccessibleProductName(product)

  return (
    <div className="min-w-0 rounded-base bg-surface p-400 sm:p-550">
      <ProductDetailPurchasePanelHeader
        displayOriginalLabel={displayOriginalLabel}
        offerState={offerState}
        product={product}
        productCategories={productCategories}
        quantity={quantity}
        selectedVariantId={selectedVariantId}
      />

      <section className="flex min-w-0 flex-col gap-700">
        <header>
          <h1 className="min-w-0 break-words font-semibold text-2xl text-fg-primary leading-none md:text-3xl">
            {product.title}
          </h1>
        </header>

        <ul className="space-y-50">
          {displayHighlights.map((highlight) => (
            <li
              className="relative pt-100 pl-500 text-fg-primary text-sm leading-tight md:text-md"
              key={highlight}
            >
              <span className="absolute top-300 left-0 h-200 w-200 rounded-full bg-primary" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <ProductDetailPurchasePanelPricing
          currentAmountLabel={currentAmountLabel}
          displayOriginalLabel={displayOriginalLabel}
          unitPriceLabel={unitPriceLabel}
          vipCreditLabel={vipCreditLabel}
        />

        {variantItems.length > 1 ? (
          <Select
            className="w-full sm:max-w-product-variant"
            items={variantItems}
            onValueChange={({ value }) => {
              const [nextVariantId] = value
              onVariantChange(nextVariantId ?? null)
            }}
            size="lg"
            value={
              selectedVariantId === null || selectedVariantId === ""
                ? []
                : [selectedVariantId]
            }
          >
            <Select.Label>
              {tCatalog("product_detail.variant_label")}
            </Select.Label>
            <Select.Control>
              <Select.Trigger className="rounded-select-lg">
                <Select.ValueText
                  placeholder={tCatalog("product_detail.variant_placeholder")}
                />
              </Select.Trigger>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {variantItems.map((item) => (
                  <Select.Item item={item} key={item.value}>
                    <Select.ItemText />
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select>
        ) : null}

        <div className="grid min-h-purchase-panel-footer min-w-0 items-center gap-350 sm:grid-cols-4">
          <NumericInput
            className="w-full min-w-0 px-0 xl:px-300"
            id="product-quantity"
            locale={locale}
            max={maxQuantity}
            min={1}
            onChange={(value) => {
              if (!Number.isFinite(value) || value < 1) {
                onQuantityChange(1)
                return
              }

              onQuantityChange(Math.min(Math.floor(value), maxQuantity))
            }}
            value={quantity}
          >
            <NumericInput.Control className="grid h-full grid-cols-3 place-items-center">
              <NumericInput.DecrementTrigger className="min-h-750 w-auto" />
              <NumericInput.Input
                aria-label={tCatalog("product_detail.quantity_aria", {
                  productName: accessibleProductName,
                })}
                className="min-h-750 px-0 py-0 text-center"
              />
              <NumericInput.IncrementTrigger className="min-h-750 w-auto" />
            </NumericInput.Control>
          </NumericInput>
          <Button
            block
            className="h-full min-w-0 text-md sm:col-span-3"
            disabled={!canAddToCart}
            icon="token-icon-cart"
            iconSize="xl"
            isLoading={isAdding}
            loadingText={tCart("adding_to_cart")}
            onClick={onAddToCart}
            variant="primary"
          >
            {tCart("add_to_cart")}
          </Button>
        </div>
      </section>
    </div>
  )
}
