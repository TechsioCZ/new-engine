"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select"
import NextLink from "next/link"
import type {
  ProductOfferState,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types"
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers"
import { asRecord, asString } from "@/components/product-detail/utils/value-utils"
import { resolveFlags } from "@/components/product-card/product-card.flags"
import { createBrandSlug } from "@/lib/storefront/brands"

type ProductInfoLink = {
  href: string | null
  label: string
}

const resolveProductInfoLink = (
  product: StorefrontProduct,
  primaryCategory?: HttpTypes.StoreProductCategory,
): ProductInfoLink | null => {
  const producer = asRecord(
    (product as StorefrontProduct & { producer?: unknown }).producer,
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

  if (!primaryCategory?.handle) {
    return null
  }

  return {
    href: `/c/${primaryCategory.handle}`,
    label: normalizeCategoryName(primaryCategory.name),
  }
}

type ProductDetailPurchasePanelProps = {
  canAddToCart: boolean
  currentAmountLabel: string
  displayOriginalLabel: string | null
  isAdding: boolean
  offerState: ProductOfferState
  onAddToCart: () => void
  onQuantityChange: (quantity: number) => void
  onVariantChange: (variantId: string | null) => void
  product: StorefrontProduct
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
  const primaryCategory = productCategories[0]
  const productInfoLink = resolveProductInfoLink(product, primaryCategory)
  const flags = resolveFlags(product, Boolean(displayOriginalLabel))
  const displayHighlights = productHighlights
    .map((highlight) => highlight.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="space-y-300 rounded-lg border border-border-secondary bg-surface p-350">
      <div className="flex min-h-600 flex-wrap items-start gap-200">
        {flags.map((flag) => (
          <Badge
            className="leading-tight font-bold"
            key={`${product.id}-${flag.label}`}
            variant={flag.variant}
          >
            {flag.label}
          </Badge>
        ))}

        <div className="ml-auto flex min-w-0 items-center gap-300 sm:gap-500">
          <div className="min-w-0 flex flex-wrap items-center gap-x-100 gap-y-50">
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

          <Button
            aria-label="Pridať do obľúbených"
            className="h-750 min-h-750 w-750 min-w-750 p-0 text-fg-secondary hover:text-fg-primary sm:h-600 sm:min-h-600 sm:w-600 sm:min-w-600"
            size="sm"
            theme="borderless"
            variant="secondary"
          >
            <Icon icon="token-icon-heart" size="2xl" />
          </Button>
        </div>
      </div>

      <header className="space-y-200">
        <h1 className="font-semibold text-2xl md:text-3xl text-fg-primary leading-none">
          {product.title}
        </h1>
      </header>

      <ul className="space-y-50">
        {displayHighlights.map((highlight) => (
          <li
            className="relative pt-100 pl-500 text-fg-primary text-sm md:text-md leading-tight"
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
            <p className="font-medium text-xl md:text-3xl text-fg-primary leading-tight">
              {currentAmountLabel}
            </p>
            {displayOriginalLabel ? (
              <span className="pb-50 font-normal text-fg-secondary text-md md:text-lg leading-normal line-through">
                {displayOriginalLabel}
              </span>
            ) : null}
          </div>
          {unitPriceLabel ? (
            <p className="text-fg-primary text-sm md:text-md leading-tight">
              {unitPriceLabel}
            </p>
          ) : null}
        </div>

        {vipCreditLabel ? (
          <div className="flex w-full items-center gap-400 rounded-sm bg-highlight px-400 py-200 sm:w-auto">
            <Icon
              className="text-primary"
              icon="token-icon-save-money"
            />
            <div className="space-y-50">
              <p className="font-semibold text-fg-primary text-md leading-tight">
                VIP kredit
              </p>
              <p className="text-fg-secondary text-sm leading-tight">
                {`Nákupom získate ${vipCreditLabel}`}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {variantItems.length > 1 ? (
        <Select
          items={variantItems}
          onValueChange={(details) => {
            onVariantChange(details.value[0] ?? null)
          }}
          className="max-w-xs"
          size="lg"
          value={selectedVariantId ? [selectedVariantId] : []}
        >
          <Select.Label>Varianta</Select.Label>
          <Select.Control>
            <Select.Trigger className="rounded-select-lg">
              <Select.ValueText placeholder="Vyberte variantu" />
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

      <div className="grid items-center gap-350 sm:grid-cols-4">
        <div>
          <NumericInput
            className="w-full"
            id="product-quantity"
            max={50}
            min={1}
            onChange={(value) => {
              if (!Number.isFinite(value) || value < 1) {
                onQuantityChange(1)
                return
              }

              onQuantityChange(Math.floor(value))
            }}
            value={quantity}
          >
            <NumericInput.Control className="min-h-750">
              <NumericInput.DecrementTrigger className="min-h-750 min-w-750" />
              <NumericInput.Input className="min-h-750 text-center" />
              <NumericInput.IncrementTrigger className="min-h-750 min-w-750" />
            </NumericInput.Control>
          </NumericInput>
        </div>

        <Button
          block
          className="min-h-750 sm:col-span-3"
          disabled={!canAddToCart}
          icon="token-icon-cart"
          isLoading={isAdding}
          loadingText="Pridávam..."
          onClick={onAddToCart}
          variant="primary"
        >
          Pridať do košíka
        </Button>
      </div>
    </div>
  )
}
