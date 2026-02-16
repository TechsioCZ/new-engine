"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import NextLink from "next/link";

type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
  currentAmount: number | null;
  originalAmount: number | null;
  currencyCode: string;
};

type ProductFlagState = {
  label: string;
  variant: "success" | "warning" | "discount";
};

type TopOfferPriceState = {
  currentAmount: number | null;
  originalAmount: number | null;
  currencyCode: string;
};

const PRODUCT_FALLBACK_IMAGE = "/file.svg";

const FLAG_CONFIG = {
  action: { label: "Akcia", variant: "discount" },
  new: { label: "Novinka", variant: "success" },
  tip: { label: "Tip", variant: "warning" },
} as const;

type SupportedFlagCode = keyof typeof FLAG_CONFIG;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  return null;
};

const formatAmount = (amount: number, currencyCode: string): string => {
  const normalizedCurrency =
    typeof currencyCode === "string" && currencyCode.length === 3
      ? currencyCode.toUpperCase()
      : "EUR";
  const locale = normalizedCurrency === "CZK" ? "cs-CZ" : "sk-SK";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`;
  }
};

const resolveTopOfferPriceState = (
  product: HttpTypes.StoreProduct,
): TopOfferPriceState => {
  const metadata = asRecord(product.metadata);
  const topOffer = asRecord(metadata?.top_offer);

  if (!topOffer) {
    return {
      currentAmount: null,
      originalAmount: null,
      currencyCode: "EUR",
    };
  }

  const currencyCode =
    typeof topOffer.currency === "string" && topOffer.currency.length === 3
      ? topOffer.currency
      : "EUR";

  const currentAmount =
    asNumber(topOffer.current_price) ??
    asNumber(topOffer.action_price) ??
    asNumber(topOffer.price_vat);
  const compareAtAmount =
    asNumber(topOffer.compare_at_price) ?? asNumber(topOffer.standard_price);
  const originalAmount =
    currentAmount !== null &&
    compareAtAmount !== null &&
    compareAtAmount > currentAmount
      ? compareAtAmount
      : null;

  return {
    currentAmount,
    originalAmount,
    currencyCode,
  };
};

const resolvePriceState = (
  product: HttpTypes.StoreProduct,
): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const calculatedOriginalAmount = calculatedPrice?.original_amount;
  const topOfferPrice = resolveTopOfferPriceState(product);

  const currentAmount =
    typeof calculatedAmount === "number"
      ? calculatedAmount
      : topOfferPrice.currentAmount;
  const currencyCode =
    typeof calculatedPrice?.currency_code === "string"
      ? calculatedPrice.currency_code
      : topOfferPrice.currencyCode;

  const originalAmount =
    typeof calculatedOriginalAmount === "number" &&
    typeof currentAmount === "number" &&
    calculatedOriginalAmount > currentAmount
      ? calculatedOriginalAmount
      : typeof topOfferPrice.originalAmount === "number" &&
          typeof currentAmount === "number" &&
          topOfferPrice.originalAmount > currentAmount
        ? topOfferPrice.originalAmount
        : null;

  if (typeof currentAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode,
    };
  }

  const currentLabel = formatAmount(currentAmount, currencyCode);
  const originalLabel =
    typeof originalAmount === "number" && originalAmount > currentAmount
      ? formatAmount(originalAmount, currencyCode)
      : null;

  return {
    currentLabel,
    originalLabel,
    currentAmount,
    originalAmount,
    currencyCode,
  };
};

const resolveFlags = (
  product: HttpTypes.StoreProduct,
  hasDiscount: boolean,
): ProductFlagState[] => {
  const metadata = asRecord(product.metadata);
  const flags = metadata?.flags;

  if (!Array.isArray(flags)) {
    return hasDiscount
      ? [
          {
            label: FLAG_CONFIG.action.label,
            variant: FLAG_CONFIG.action.variant,
          },
        ]
      : [];
  }

  const resolvedFlags: ProductFlagState[] = [];
  const usedCodes = new Set<SupportedFlagCode>();

  for (const flag of flags) {
    const flagRecord = asRecord(flag);
    if (!flagRecord) {
      continue;
    }

    const code = flagRecord.code;
    const active = asBoolean(flagRecord.active);

    if (typeof code !== "string") {
      continue;
    }

    if (!(code in FLAG_CONFIG)) {
      continue;
    }

    const typedCode = code as SupportedFlagCode;
    const isActive =
      typedCode === "action" ? active === true || hasDiscount : active === true;

    if (!isActive) {
      continue;
    }

    if (usedCodes.has(typedCode)) {
      continue;
    }

    usedCodes.add(typedCode);
    const config = FLAG_CONFIG[typedCode];

    resolvedFlags.push({
      label: config.label,
      variant: config.variant,
    });
  }

  if (hasDiscount && !usedCodes.has("action")) {
    resolvedFlags.push({
      label: FLAG_CONFIG.action.label,
      variant: FLAG_CONFIG.action.variant,
    });
  }

  return resolvedFlags;
};

const resolveThumbnail = (product: HttpTypes.StoreProduct): string => {
  return product.thumbnail || PRODUCT_FALLBACK_IMAGE;
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;/gi, "'");
};

const stripHtml = (value: string): string => {
  return decodeHtmlEntities(value)
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n{2,}/g, "\n")
    .replaceAll(/[ \t]{2,}/g, " ")
    .trim();
};

const toBulletLines = (value: string): string | null => {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean);

  if (sentences.length < 2) {
    return null;
  }

  return sentences
    .slice(0, 3)
    .map((sentence) => `• ${sentence}`)
    .join("\n");
};

const extractListItems = (value: string): string[] => {
  const listMatches = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (listMatches.length === 0) {
    return [];
  }

  return listMatches.map((item) => stripHtml(item[1] || "")).filter(Boolean);
};

const resolveDescription = (product: HttpTypes.StoreProduct): string | null => {
  const metadata = asRecord(product.metadata);
  const contentSectionsMap = asRecord(metadata?.content_sections_map);
  const descriptionSection =
    typeof contentSectionsMap?.description === "string"
      ? contentSectionsMap.description
      : null;
  const usageSection =
    typeof contentSectionsMap?.usage === "string"
      ? contentSectionsMap.usage
      : null;
  const shortDescription =
    typeof metadata?.short_description === "string"
      ? metadata.short_description
      : null;

  const htmlCandidates = [
    descriptionSection,
    usageSection,
    shortDescription,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  for (const candidate of htmlCandidates) {
    const listItems = extractListItems(candidate);
    if (listItems.length === 0) {
      continue;
    }

    const cardListItems = listItems.length > 1 ? listItems.slice(1) : listItems;

    return cardListItems
      .slice(0, 3)
      .map((item) => `• ${item}`)
      .join("\n");
  }

  const textSource = htmlCandidates.find((candidate) => stripHtml(candidate));
  if (!textSource) {
    return null;
  }

  const text = stripHtml(textSource);
  if (!text) {
    return null;
  }

  return toBulletLines(text) || text;
};

const resolveDiscountLabel = (price: ProductPriceState): string | null => {
  if (
    typeof price.currentAmount !== "number" ||
    typeof price.originalAmount !== "number" ||
    price.originalAmount <= price.currentAmount
  ) {
    return null;
  }

  const discountAmount = price.originalAmount - price.currentAmount;
  return `-${formatAmount(discountAmount, price.currencyCode)}`;
};

export const getProductPriceLabel = (
  product: HttpTypes.StoreProduct,
): string => {
  return resolvePriceState(product).currentLabel;
};

type HerbatikaProductCardProps = {
  product: HttpTypes.StoreProduct;
  isAdding: boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void;
};

export function HerbatikaProductCard({
  product,
  isAdding,
  onAddToCart,
  onProductHoverStart,
  onProductHoverEnd,
}: HerbatikaProductCardProps) {
  const productHref = product.handle ? `/p/${product.handle}` : "/#";
  const defaultVariantId = product.variants?.[0]?.id;
  const price = resolvePriceState(product);
  const discountLabel = resolveDiscountLabel(price);
  const flags = resolveFlags(product, Boolean(discountLabel));
  const title = product.title || "Produkt";
  const description = resolveDescription(product);

  return (
    <ProductCard className="h-full max-w-none rounded-md border-transparent bg-surface p-[20px] pb-[26px] shadow-none">
      <div className="relative pb-[10px]">
        <Link
          as={NextLink}
          className="block"
          href={productHref}
          onBlur={() => onProductHoverEnd?.(product)}
          onFocus={() => onProductHoverStart?.(product)}
          onMouseEnter={() => onProductHoverStart?.(product)}
          onMouseLeave={() => onProductHoverEnd?.(product)}
        >
          <ProductCard.Image
            alt={title}
            className="w-full object-cover"
            src={resolveThumbnail(product)}
          />
        </Link>

        {flags.length > 0 ? (
          <ProductCard.Badges className="absolute top-0 left-0 flex-col gap-[3.4px]">
            {flags.map((flag) => (
              <Badge
                className="rounded-[6px] px-[7.68px] py-[3.24px] text-[12.5px] leading-[14px] font-bold"
                key={`${product.id}-${flag.label}`}
                variant={flag.variant}
              >
                {flag.label}
              </Badge>
            ))}
          </ProductCard.Badges>
        ) : null}

        {discountLabel ? (
          <div className="absolute right-0 bottom-0 rounded-[6px] bg-tertiary px-[8px] py-[8px]">
            <span className="text-[11.5px] leading-[13px] font-bold text-fg-reverse">
              {discountLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex h-full flex-col gap-[18px]">
        <div className="flex flex-col gap-[9.6px]">
          <ProductCard.Name className="min-h-[44px] text-[18px] leading-[22px] font-semibold text-fg-primary">
            <Link
              as={NextLink}
              className="hover:text-primary"
              href={productHref}
            >
              {title}
            </Link>
          </ProductCard.Name>

          {description ? (
            <p className="line-clamp-3 min-h-[52px] whitespace-pre-line text-[13.4px] leading-[17px] text-fg-secondary">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="flex min-h-[38px] flex-col justify-end">
            {price.originalLabel && (
              <span className="text-[12.5px] leading-[17px] text-fg-tertiary line-through">
                {price.originalLabel}
              </span>
            )}
            <ProductCard.Price className="text-[19.2px] leading-[19px] font-bold text-fg-primary">
              {price.currentLabel}
            </ProductCard.Price>
          </div>

          <ProductCard.Actions className="mt-0 shrink-0">
            <Button
              className="[&_.token-icon-cart]:text-[20px] inline-flex h-[39.68px] min-w-[119.92px] items-center gap-[6.72px] rounded-[7px] border border-primary bg-primary px-[13.08px] py-[4.76px] text-[13.4px] leading-[23px] font-medium text-fg-reverse hover:bg-primary-hover"
              icon="token-icon-cart"
              isLoading={isAdding}
              onClick={() => {
                void onAddToCart(product);
              }}
              size="current"
              disabled={!defaultVariantId}
              type="button"
            >
              Do košíka
            </Button>
          </ProductCard.Actions>
        </div>
      </div>
    </ProductCard>
  );
}
