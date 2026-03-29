"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import NextLink from "next/link";
import type {
  ProductOfferState,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types";
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers";

type ProductDetailPurchasePanelProps = {
  currentAmountLabel: string;
  discountPercent: number | null;
  displayOriginalLabel: string | null;
  isAdding: boolean;
  offerState: ProductOfferState;
  onAddToCart: () => void;
  onQuantityChange: (quantity: number) => void;
  onVariantChange: (variantId: string | null) => void;
  product: StorefrontProduct;
  productCategories: HttpTypes.StoreProductCategory[];
  productHighlights: string[];
  quantity: number;
  selectedVariantId: string | null;
  unitPriceLabel: string | null;
  variantItems: SelectItem[];
  vipCreditLabel: string | null;
};

export function ProductDetailPurchasePanel({
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
  const primaryCategory = productCategories[0];
  const displayHighlights = productHighlights
    .map((highlight) => highlight.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="space-y-300 rounded-lg border border-border-secondary bg-surface p-350">
      <div className="flex min-h-600 items-center justify-between gap-200">
        {offerState.hasActiveDiscount ? (
          <Badge className="font-bold" variant="tertiary">
            Akcia
          </Badge>
        ) : (
          <span />
        )}

        <div className="ml-auto flex items-center gap-500">
          <div className="flex items-center gap-100">
            <span className="text-sm leading-tight text-fg-placeholder">
              ID: {offerState.code ?? product.handle}
            </span>
            {primaryCategory?.handle ? (
              <>
                <span className="text-sm leading-tight text-fg-placeholder">•</span>
                <Link
                  as={NextLink}
                  className="text-sm leading-tight font-normal text-primary underline hover:text-primary-strong"
                  href={`/c/${primaryCategory.handle}`}
                >
                  {normalizeCategoryName(primaryCategory.name)}
                </Link>
              </>
            ) : null}
          </div>

          <Button
            aria-label="Pridať do obľúbených"
            className="h-600 w-600 min-h-600 min-w-600 p-0 text-fg-secondary hover:text-fg-primary"
            size="sm"
            theme="borderless"
            variant="secondary"
          >
            <Icon className="text-2xl" icon="token-icon-heart" />
          </Button>
        </div>
      </div>

      <header className="space-y-200">
        <h1 className="text-3xl font-semibold leading-none text-fg-primary">
          {product.title}
        </h1>
      </header>

      <ul className="space-y-50">
        {displayHighlights.map((highlight) => (
          <li
            className="relative pl-500 pt-100 text-md leading-tight text-fg-primary"
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
            <p className="text-3xl leading-tight font-medium text-fg-primary">
              {currentAmountLabel}
            </p>
            {displayOriginalLabel ? (
              <span className="pb-50 text-lg leading-normal font-normal text-fg-secondary line-through">
                {displayOriginalLabel}
              </span>
            ) : null}
          </div>
          {unitPriceLabel ? (
            <p className="text-md leading-tight text-fg-primary">{unitPriceLabel}</p>
          ) : null}
        </div>

        {vipCreditLabel ? (
          <div className="flex items-center gap-400 rounded-sm bg-highlight px-400 py-200">
            <Icon className="text-primary" icon="icon-[mdi--star-check-outline]" />
            <div className="space-y-50">
              <p className="text-md leading-tight font-semibold text-fg-primary">
                VIP kredit
              </p>
              <p className="text-sm leading-tight text-fg-secondary">
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
            onVariantChange(details.value[0] ?? null);
          }}
          size="sm"
          value={selectedVariantId ? [selectedVariantId] : []}
        >
          <Select.Label>Varianta</Select.Label>
          <Select.Control>
            <Select.Trigger>
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
        <div className="sm:col-span-1 sm:px-300">
          <NumericInput
            id="product-quantity"
            max={50}
            min={1}
            onChange={(value) => {
              if (!Number.isFinite(value) || value < 1) {
                onQuantityChange(1);
                return;
              }

              onQuantityChange(Math.floor(value));
            }}
            size="sm"
            value={quantity}
          >
            <div className="grid grid-cols-3 overflow-hidden rounded-sm border border-border-primary">
              <NumericInput.DecrementTrigger
                className="rounded-none border-0 bg-transparent px-0 py-300 text-md leading-tight text-fg-primary disabled:opacity-35"
                icon="icon-[mdi--minus]"
                theme="borderless"
              />
              <NumericInput.Control className="rounded-none border-x-0 border-y-0 border-border-primary bg-transparent">
                <NumericInput.Input className="rounded-none border-0 focus:bg-base px-200 py-300 text-center text-md" />
              </NumericInput.Control>
              <NumericInput.IncrementTrigger
                className="rounded-none border-0 bg-transparent px-0 py-300 text-md leading-tight text-fg-primary"
                icon="icon-[mdi--plus]"
                theme="borderless"
              />
            </div>
          </NumericInput>
        </div>

        <Button
          block
          className="sm:col-span-3"
          disabled={!selectedVariantId}
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
  );
}
