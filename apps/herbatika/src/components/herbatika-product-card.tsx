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

const resolvePriceState = (
  product: HttpTypes.StoreProduct,
): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const originalAmount = calculatedPrice?.original_amount;
  const currencyCode =
    typeof calculatedPrice?.currency_code === "string"
      ? calculatedPrice.currency_code
      : "EUR";

  if (typeof calculatedAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode,
    };
  }

  const currentLabel = formatAmount(calculatedAmount, currencyCode);
  const originalLabel =
    typeof originalAmount === "number" && originalAmount > calculatedAmount
      ? formatAmount(originalAmount, currencyCode)
      : null;

  return {
    currentLabel,
    originalLabel,
    currentAmount: calculatedAmount,
    originalAmount: typeof originalAmount === "number" ? originalAmount : null,
    currencyCode,
  };
};

const resolveFlags = (product: HttpTypes.StoreProduct): ProductFlagState[] => {
  const metadata = asRecord(product.metadata);
  const flags = metadata?.flags;

  if (!Array.isArray(flags)) {
    return [];
  }

  const resolvedFlags: ProductFlagState[] = [];
  const usedCodes = new Set<SupportedFlagCode>();

  for (const flag of flags) {
    const flagRecord = asRecord(flag);
    if (!flagRecord) {
      continue;
    }

    const code = flagRecord.code;
    const active = flagRecord.active;

    if (active !== true || typeof code !== "string") {
      continue;
    }

    if (!(code in FLAG_CONFIG)) {
      continue;
    }

    const typedCode = code as SupportedFlagCode;

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

const resolveDescription = (product: HttpTypes.StoreProduct): string | null => {
  const metadata = asRecord(product.metadata);
  const shortDescription =
    typeof metadata?.short_description === "string"
      ? metadata.short_description
      : null;

  if (!shortDescription) {
    return null;
  }

  const listMatches = [
    ...shortDescription.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi),
  ];
  if (listMatches.length > 0) {
    const bullets = listMatches
      .map((item) => stripHtml(item[1] || ""))
      .filter(Boolean)
      .slice(0, 3)
      .map((item) => `• ${item}`);

    if (bullets.length > 0) {
      return bullets.join("\n");
    }
  }

  const text = stripHtml(shortDescription);
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
  const flags = resolveFlags(product);
  const title = product.title || "Produkt";
  const description = resolveDescription(product);
  const discountLabel = resolveDiscountLabel(price);

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
