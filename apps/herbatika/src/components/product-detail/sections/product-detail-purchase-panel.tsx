"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input";
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
  freeShippingThresholdLabel: string;
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
  discountPercent,
  displayOriginalLabel,
  freeShippingThresholdLabel,
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
  return (
    <div className="space-y-400 rounded-lg border border-border-secondary bg-surface p-400">
      <div className="flex flex-wrap items-center justify-between gap-200">
        <div className="flex flex-wrap items-center gap-200">
          <ExtraText className="text-fg-tertiary">ID: {offerState.code ?? product.handle}</ExtraText>
          {offerState.ean ? <Badge variant="outline">{`EAN ${offerState.ean}`}</Badge> : null}
        </div>
        {offerState.hasActiveDiscount && discountPercent ? (
          <Badge variant="discount">{`-${discountPercent}%`}</Badge>
        ) : null}
      </div>

      <header className="space-y-250">
        <h1 className="text-3xl font-bold leading-tight text-fg-primary">{product.title}</h1>

        {productCategories.length > 0 ? (
          <div className="flex flex-wrap gap-200">
            {productCategories.slice(0, 8).map((category) => {
              if (!category.handle) {
                return null;
              }

              return (
                <Link
                  as={NextLink}
                  className="text-sm font-medium text-fg-primary hover:text-primary"
                  href={`/c/${category.handle}`}
                  key={category.id}
                >
                  {normalizeCategoryName(category.name)}
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      <ul className="space-y-150">
        {productHighlights.map((highlight) => (
          <li className="flex items-start gap-150 text-sm text-fg-secondary" key={highlight}>
            <Icon className="mt-50 text-primary" icon="token-icon-check" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-300">
        <div className="space-y-100">
          {displayOriginalLabel ? (
            <p className="text-sm text-fg-tertiary line-through">{displayOriginalLabel}</p>
          ) : null}
          <p className="text-3xl font-bold text-primary">{currentAmountLabel}</p>
          {unitPriceLabel ? <ExtraText className="text-fg-tertiary">{unitPriceLabel}</ExtraText> : null}
        </div>

        {vipCreditLabel ? (
          <div className="rounded-lg border border-border-secondary bg-surface-secondary px-300 py-200 text-right">
            <ExtraText className="font-semibold text-primary">VIP kredit</ExtraText>
            <ExtraText className="text-fg-secondary">{`Nákupom získate ${vipCreditLabel}`}</ExtraText>
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

      <div className="grid gap-300 sm:grid-cols-3">
        <FormNumericInput
          id="product-quantity"
          label="Množstvo"
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
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>

        <Button
          block
          className="sm:self-end"
          disabled={!selectedVariantId || isAdding}
          onClick={onAddToCart}
          variant="primary"
        >
          {isAdding ? "Pridávam..." : "Pridať do košíka"}
        </Button>

        <LinkButton
          as={NextLink}
          className="sm:self-end"
          href="/checkout"
          theme="outlined"
          variant="secondary"
        >
          Košík
        </LinkButton>
      </div>

      <div className="rounded-lg border border-border-secondary bg-highlight px-300 py-250">
        <div className="flex flex-wrap items-center justify-between gap-250">
          <StatusText showIcon size="sm" status={offerState.isInStock ? "success" : "warning"}>
            {offerState.availabilityLabel}
          </StatusText>
          <StatusText showIcon size="sm" status="success">
            {`Doručenie zdarma nad ${freeShippingThresholdLabel}`}
          </StatusText>
        </div>
      </div>
    </div>
  );
}
