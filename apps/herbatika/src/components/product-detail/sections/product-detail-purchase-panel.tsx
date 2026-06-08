"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import NextLink from "next/link";
import { resolveFlags } from "@/components/product-card/product-card.flags";
import type {
  Product,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types";
import { ProductListPickerPopover } from "@/components/product-lists/product-list-picker-popover";
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers";
import {
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils";
import { createBrandSlug } from "@/lib/storefront/brands";

type ProductInfoLink = {
  href: string | null;
  label: string;
};

const resolveProductInfoLink = (
  product: Product,
  primaryCategory?: HttpTypes.StoreProductCategory,
): ProductInfoLink | null => {
  const producer = asRecord(
    (product as Product & { producer?: unknown }).producer,
  );
  const producerTitle = asString(producer?.title);

  if (producerTitle) {
    const producerHandle = asString(producer?.handle);
    const producerSlug = createBrandSlug(producerHandle || producerTitle);

    return {
      href: producerSlug ? `/znacka/${producerSlug}` : null,
      label: producerTitle,
    };
  }

  if (!primaryCategory?.handle) {
    return null;
  }

  return {
    href: `/c/${primaryCategory.handle}`,
    label: normalizeCategoryName(primaryCategory.name),
  };
};

type ProductDetailPurchasePanelProps = {
  canAddToCart: boolean;
  currentAmountLabel: string;
  displayOriginalLabel: string | null;
  isAdding: boolean;
  maxQuantity: number;
  offerState: ProductOfferState;
  onAddToCart: () => void;
  onQuantityChange: (quantity: number) => void;
  onVariantChange: (variantId: string | null) => void;
  product: Product;
  productCategories: HttpTypes.StoreProductCategory[];
  productHighlights: string[];
  quantity: number;
  selectedVariantId: string | null;
  unitPriceLabel: string | null;
  variantItems: SelectItem[];
  vipCreditLabel: string | null;
};

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
  const primaryCategory = productCategories[0];
  const productInfoLink = resolveProductInfoLink(product, primaryCategory);
  const flags = resolveFlags(product, Boolean(displayOriginalLabel));
  const displayHighlights = productHighlights
    .map((highlight) => highlight.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="min-w-0 rounded-base bg-surface p-400 sm:p-550">
      <div className="flex min-h-600 min-w-0 flex-wrap items-start gap-200 pb-500">
        {flags.map((flag) => (
          <Badge
            className="leading-tight font-bold"
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
          <h1 className="min-w-0 break-words font-semibold text-2xl md:text-3xl text-fg-primary leading-none">
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
            <div className="flex w-full min-w-0 items-center gap-400 rounded-sm bg-highlight px-400 py-200 sm:w-auto">
              <Icon
                className="text-primary"
                icon="token-icon-save-money"
                size="lg"
              />
              <div className="min-w-0 space-y-50">
                <p className="font-semibold text-fg-primary text-md leading-tight">
                  VIP kredit
                </p>
                <p className="break-words text-fg-secondary text-sm leading-tight">
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
            className="w-full sm:max-w-xs"
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

        <div className="grid min-w-0 items-center gap-350 sm:grid-cols-4 min-h-purchase-panel-footer">
          <NumericInput
            className="min-w-0 w-full px-0 xl:px-300"
            id="product-quantity"
            max={maxQuantity}
            min={1}
            onChange={(value) => {
              if (!Number.isFinite(value) || value < 1) {
                onQuantityChange(1);
                return;
              }

              onQuantityChange(Math.min(Math.floor(value), maxQuantity));
            }}
            value={quantity}
          >
            <NumericInput.Control className="grid grid-cols-3 place-items-center h-full">
              <NumericInput.DecrementTrigger className="min-h-750 w-auto" />
              <NumericInput.Input className="min-h-750 text-center px-0 py-0" />
              <NumericInput.IncrementTrigger className="min-h-750 w-auto" />
            </NumericInput.Control>
          </NumericInput>
          <Button
            block
            className="min-w-0 h-full sm:col-span-3 text-md"
            disabled={!canAddToCart}
            icon="token-icon-cart"
            isLoading={isAdding}
            loadingText="Pridávam..."
            onClick={onAddToCart}
            variant="primary"
            iconSize="xl"
          >
            Pridať do košíka
          </Button>
        </div>
      </section>
    </div>
  );
}
