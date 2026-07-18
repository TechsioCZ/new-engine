"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select"
import { useLocale, useTranslations } from "next-intl"
import NextLink from "next/link"
import { resolveFlags } from "@/components/product-card/product-card.flags"
import type {
  Product,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers"
import {
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils"
import { ProductListPickerPopover } from "@/components/product-lists/product-list-picker-popover"
import { createBrandSlug } from "@/lib/storefront/brands"

type ProductInfoLink = {
  href: string | null
  label: string
}

const resolveProductInfoLink = (
  product: Product,
  primaryCategory: HttpTypes.StoreProductCategory | undefined
): ProductInfoLink | null => {
  const producer = asRecord(
    (product as Product & { producer?: unknown }).producer
  )
  const producerTitle = asString(producer?.title)

  if (producerTitle) {
    const producerHandle = asString(producer?.handle)
    const producerSlug = createBrandSlug(producerHandle || producerTitle)

    return {
      href: producerSlug ? `/znacka/${producerSlug}` : null,
      label: producerTitle,
    }
  }

  const primaryCategoryName = normalizeCategoryName(primaryCategory?.name, "")
  if (!(primaryCategory?.handle && primaryCategoryName)) {
    return null
  }

  return {
    href: `/c/${primaryCategory.handle}`,
    label: primaryCategoryName,
  }
}

type ProductDetailPurchasePanelProps = {
  canAddToCart: boolean
  currentAmountLabel: string
  displayOriginalLabel: string | null
  isAdding: boolean
  maxQuantity: number
  offerState: ProductOfferState
  onAddToCart: () => void
  onQuantityChange: (quantity: number) => void
  onVariantChange: (variantId: string | null) => void
  product: Product
  productCategories: HttpTypes.StoreProductCategory[]
  productHighlights: string[]
  quantity: number
  selectedVariantId: string | null
  unitPriceLabel: string | null
  variantItems: SelectItem[]
  vipCreditLabel: string | null
}

export function ProductDetailPurchasePanel({
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
}: ProductDetailPurchasePanelProps) {
  const locale = useLocale()
  const tCart = useTranslations("cart")
  const tCatalog = useTranslations("catalog")
  const primaryCategory = productCategories[0]
  const productInfoLink = resolveProductInfoLink(product, primaryCategory)
  const flags = resolveFlags(product, Boolean(displayOriginalLabel), {
    action: tCatalog("filters.status.action"),
    new: tCatalog("filters.status.new"),
    tip: tCatalog("filters.status.tip"),
  })
  const displayHighlights = productHighlights
    .map((highlight) => highlight.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="min-w-0 rounded-base bg-surface p-400 sm:p-550">
      <div className="flex min-h-600 min-w-0 flex-wrap items-start gap-200 pb-500">
        {flags.map((flag) => (
          <Badge
            className="font-bold leading-tight"
            key={`${product.id}-${flag.label}`}
            variant={flag.variant}
          >
            {flag.label}
          </Badge>
        ))}

        <div className="flex w-full min-w-0 items-center justify-between gap-300 sm:ml-auto sm:w-auto sm:gap-500">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-100 gap-y-50">
            <span className="text-fg-placeholder text-sm leading-tight">
              ID: {offerState.code ?? product.handle}
            </span>
            {productInfoLink ? (
              <>
                <span className="text-fg-placeholder text-sm leading-tight">
                  •
                </span>
                {productInfoLink.href ? (
                  <Link
                    as={NextLink}
                    className="min-w-0 break-words font-normal text-primary text-sm leading-tight underline hover:text-primary-strong"
                    href={productInfoLink.href}
                  >
                    {productInfoLink.label}
                  </Link>
                ) : (
                  <span className="min-w-0 break-words text-primary text-sm leading-tight">
                    {productInfoLink.label}
                  </span>
                )}
              </>
            ) : null}
          </div>

          <ProductListPickerPopover
            product={product}
            quantity={quantity}
            selectedVariantId={selectedVariantId}
          />
        </div>
      </div>

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

        <div className="flex flex-wrap items-end justify-between gap-250">
          <div className="space-y-200">
            <div className="flex flex-wrap items-end gap-150">
              <p className="font-medium text-fg-primary text-xl leading-tight md:text-3xl">
                {currentAmountLabel}
              </p>
              {displayOriginalLabel ? (
                <span className="pb-50 font-normal text-fg-secondary text-md leading-normal line-through md:text-lg">
                  {displayOriginalLabel}
                </span>
              ) : null}
            </div>
            {unitPriceLabel ? (
              <p className="text-fg-primary text-sm leading-tight md:text-md">
                {unitPriceLabel}
              </p>
            ) : null}
          </div>

          {vipCreditLabel ? (
            <div className="flex w-full min-w-0 items-center gap-400 rounded-sm bg-highlight px-400 py-200 sm:w-auto">
              <Icon
                className="text-primary"
                icon="token-icon-save-money"
                size="lg"
              />
              <div className="min-w-0 space-y-50">
                <p className="font-semibold text-fg-primary text-md leading-tight">
                  {tCatalog("product_detail.vip_credit.title")}
                </p>
                <p className="break-words text-fg-secondary text-sm leading-tight">
                  {tCatalog("product_detail.vip_credit.earned", {
                    credit: vipCreditLabel,
                  })}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {variantItems.length > 1 ? (
          <Select
            className="w-full sm:max-w-xs"
            items={variantItems}
            onValueChange={(details) => {
              onVariantChange(details.value[0] ?? null)
            }}
            size="lg"
            value={selectedVariantId ? [selectedVariantId] : []}
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
                  productName:
                    product.title?.trim() ||
                    product.handle?.trim() ||
                    product.id,
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
