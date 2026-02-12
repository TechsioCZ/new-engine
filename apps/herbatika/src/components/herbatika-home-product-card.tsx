"use client";

import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import NextLink from "next/link";

type ProductStockStatus = "in-stock" | "limited-stock" | "out-of-stock";

type ProductStockState = {
  label: string;
  status: ProductStockStatus;
};

type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
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

const resolvePriceState = (product: HttpTypes.StoreProduct): ProductPriceState => {
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

const resolveStockState = (product: HttpTypes.StoreProduct): ProductStockState => {
  const metadata = asRecord(product.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const stock = asRecord(topOffer?.stock);
  const amount = stock?.amount;

  if (typeof amount !== "number") {
    return {
      label: "Skladom",
      status: "in-stock",
    };
  }

  if (amount <= 0) {
    return {
      label: "Momentálne nedostupné",
      status: "out-of-stock",
    };
  }

  if (amount <= 5) {
    return {
      label: `Posledné ${amount} ks`,
      status: "limited-stock",
    };
  }

  return {
    label: "Skladom",
    status: "in-stock",
  };
};

const resolveThumbnail = (product: HttpTypes.StoreProduct): string => {
  return product.thumbnail || PRODUCT_FALLBACK_IMAGE;
};

export const getProductPriceLabel = (product: HttpTypes.StoreProduct): string => {
  return resolvePriceState(product).currentLabel;
};

type HerbatikaHomeProductCardProps = {
  product: HttpTypes.StoreProduct;
  isAdding: boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void;
};

export function HerbatikaHomeProductCard({
  product,
  isAdding,
  onAddToCart,
  onProductHoverStart,
  onProductHoverEnd,
}: HerbatikaHomeProductCardProps) {
  const productHref = product.handle ? `/p/${product.handle}` : "/#";
  const defaultVariantId = product.variants?.[0]?.id;
  const price = resolvePriceState(product);
  const stock = resolveStockState(product);
  const flags = resolveFlags(product);
  const title = product.title || "Produkt";

  return (
    <ProductCard className="h-full max-w-none rounded-[14px] border-border-secondary bg-surface p-3 shadow-sm">
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
          className="aspect-[4/5] w-full rounded-[10px] border border-border-secondary object-cover"
          src={resolveThumbnail(product)}
        />
      </Link>

      {flags.length > 0 ? (
        <ProductCard.Badges className="mt-1 gap-1">
          {flags.map((flag) => (
            <Badge
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              key={`${product.id}-${flag.label}`}
              variant={flag.variant}
            >
              {flag.label}
            </Badge>
          ))}
        </ProductCard.Badges>
      ) : (
        <div className="h-5" />
      )}

      <ProductCard.Name className="min-h-10 text-sm leading-snug text-fg-primary">
        <Link as={NextLink} className="hover:text-primary" href={productHref}>
          {title}
        </Link>
      </ProductCard.Name>

      <ProductCard.Stock className="text-xs" status={stock.status}>
        {stock.label}
      </ProductCard.Stock>

      <div className="flex items-baseline gap-2">
        {price.originalLabel && (
          <span className="text-xs text-fg-tertiary line-through">
            {price.originalLabel}
          </span>
        )}
        <ProductCard.Price className="text-lg font-bold text-primary">
          {price.currentLabel}
        </ProductCard.Price>
      </div>

      <ProductCard.Actions className="mt-1 grid grid-cols-[1fr_auto] gap-2">
        <Button
          className="w-full rounded-[9px] bg-primary px-3 py-2 text-xs font-bold text-fg-reverse hover:bg-primary-hover"
          icon="token-icon-cart"
          isLoading={isAdding}
          onClick={() => {
            void onAddToCart(product);
          }}
          size="sm"
          disabled={!defaultVariantId}
          type="button"
        >
          Do košíka
        </Button>

        <LinkButton
          as={NextLink}
          className="rounded-[9px] px-3 py-2 text-xs font-semibold"
          href={productHref}
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          Detail
        </LinkButton>
      </ProductCard.Actions>
    </ProductCard>
  );
}
