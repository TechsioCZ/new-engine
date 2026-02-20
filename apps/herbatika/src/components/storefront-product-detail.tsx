"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import { GalleryTemplate } from "@techsio/ui-kit/templates/gallery";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import { resolveRelatedCategoryIds } from "@/lib/storefront/category-tree";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
  useProduct,
  useProducts,
} from "@/lib/storefront/products";

type StorefrontProductDetailProps = {
  handle: string;
};

type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
  currentAmount: number | null;
  originalAmount: number | null;
  currencyCode: string;
};

type RelatedProductsSection = {
  id: string;
  title: string;
  products: HttpTypes.StoreProduct[];
};

type ProductDetailContentSection = {
  key: string;
  title: string;
  html: string;
};
type StorefrontProduct = HttpTypes.StoreProduct;

type ProductOfferState = {
  code: string | null;
  ean: string | null;
  availabilityLabel: string;
  deliveryLabel: string;
  stockAmount: number | null;
  isInStock: boolean;
  offerSource: Record<string, unknown> | null;
  unitLabel: string | null;
  currentAmount: number | null;
  standardAmount: number | null;
  actionAmount: number | null;
  hasActiveDiscount: boolean;
};

type VolumeDiscountOption = {
  id: string;
  title: string;
  quantity: number;
  totalAmountLabel: string;
  perUnitLabel: string;
  oldTotalAmountLabel: string | null;
};

const PRODUCT_FALLBACK_IMAGE = "/file.svg";
const RELATED_PRODUCTS_PER_SECTION = 5;
const RELATED_SECTION_TITLES = [
  "Ďalšie kúpil tiež",
  "Súvisiace produkty",
  "Naposledy navštívené",
] as const;
const RELATED_PRODUCTS_LIMIT =
  RELATED_PRODUCTS_PER_SECTION * RELATED_SECTION_TITLES.length + 1;
const PRODUCT_DETAIL_SECTION_ORDER = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const;
const PRODUCT_DETAIL_SECTION_TITLES: Record<string, string> = {
  description: "Popis",
  usage: "Použitie",
  composition: "Zloženie",
  warning: "Upozornenie",
  other: "Ostatné informácie",
};

const ALLOWED_HTML_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const ALLOWED_GLOBAL_ATTRIBUTES = new Set(["title"]);

const ALLOWED_TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  td: new Set(["colspan", "rowspan", "title"]),
  th: new Set(["colspan", "rowspan", "title"]),
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const asNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const normalizeSectionKey = (value: unknown): string | null => {
  const parsed = asString(value);
  if (!parsed) {
    return null;
  }

  const normalized = parsed
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

  return normalized.length > 0 ? normalized : null;
};

const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
};

const resolveProductImages = (product: StorefrontProduct | null): string[] => {
  if (!product) {
    return [];
  }

  const imageUrls = new Set<string>();

  if (product.thumbnail) {
    imageUrls.add(product.thumbnail);
  }

  for (const image of product.images ?? []) {
    if (typeof image?.url === "string" && image.url.length > 0) {
      imageUrls.add(image.url);
    }
  }

  return imageUrls.size > 0 ? Array.from(imageUrls) : [PRODUCT_FALLBACK_IMAGE];
};

const resolveVariantLabel = (
  variant: HttpTypes.StoreProductVariant,
  optionTitlesById: Map<string, string>,
) => {
  const optionLabels = (variant.options ?? [])
    .map((option) => {
      const optionValue = asString(option?.value);
      if (!optionValue) {
        return null;
      }

      const optionTitle = option.option_id
        ? optionTitlesById.get(option.option_id)
        : undefined;

      return optionTitle ? `${optionTitle}: ${optionValue}` : optionValue;
    })
    .filter((value): value is string => Boolean(value));

  if (optionLabels.length > 0) {
    return optionLabels.join(" | ");
  }

  const title = asString(variant.title);

  if (title && title !== "Default") {
    return title;
  }

  return "Predvolená varianta";
};

const resolvePriceState = (
  product: StorefrontProduct,
  selectedVariantId: string | null,
): ProductPriceState => {
  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const selectedVariantMetadata = asRecord(selectedVariant?.metadata);

  const calculatedPrice = selectedVariant?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const originalAmount = calculatedPrice?.original_amount;
  const fallbackCalculatedAmount =
    asNumber(selectedVariantMetadata?.current_price) ??
    asNumber(selectedVariantMetadata?.price_vat);
  const fallbackOriginalAmount = asNumber(selectedVariantMetadata?.standard_price);
  const currencyCode =
    typeof calculatedPrice?.currency_code === "string"
      ? calculatedPrice.currency_code
      : "EUR";

  const resolvedCalculatedAmount =
    typeof calculatedAmount === "number" ? calculatedAmount : fallbackCalculatedAmount;

  if (typeof resolvedCalculatedAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode: currencyCode.toUpperCase(),
    };
  }

  const normalizedOriginalAmount =
    typeof originalAmount === "number"
      ? originalAmount
      : typeof fallbackOriginalAmount === "number"
        ? fallbackOriginalAmount
        : null;

  return {
    currentLabel: formatCurrencyAmount(resolvedCalculatedAmount, currencyCode),
    originalLabel:
      normalizedOriginalAmount && normalizedOriginalAmount > resolvedCalculatedAmount
      ? formatCurrencyAmount(normalizedOriginalAmount, currencyCode)
      : null,
    currentAmount: resolvedCalculatedAmount,
    originalAmount: normalizedOriginalAmount,
    currencyCode: currencyCode.toUpperCase(),
  };
};

const resolveOfferState = (
  product: StorefrontProduct | null,
  selectedVariant: HttpTypes.StoreProductVariant | null,
): ProductOfferState => {
  const metadata = asRecord(product?.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const variantMetadata = asRecord(selectedVariant?.metadata);
  const source = topOffer ?? variantMetadata;
  const stock = asRecord(source?.stock);
  const stockAmount = asNumber(stock?.amount);

  const isInStock = stockAmount === null ? true : stockAmount > 0;

  const inStockLabel =
    asString(source?.availability_in_stock) ?? "Skladom";
  const outOfStockLabel =
    asString(source?.availability_out_of_stock) ?? "Momentálne nie je skladom";
  const currentAmount =
    asNumber(source?.current_price) ?? asNumber(source?.price_vat);
  const standardAmount = asNumber(source?.standard_price);
  const actionAmount = asNumber(source?.action_price);
  const hasActiveDiscountFlag = asBoolean(source?.has_active_discount);
  const hasActiveDiscount =
    hasActiveDiscountFlag ??
    (typeof actionAmount === "number" &&
      typeof currentAmount === "number" &&
      actionAmount < currentAmount);

  return {
    code: asString(source?.code) ?? asString(selectedVariant?.sku),
    ean: asString(source?.ean) ?? asString(selectedVariant?.ean),
    availabilityLabel: isInStock ? inStockLabel : outOfStockLabel,
    deliveryLabel: isInStock
      ? "Doručenie 1-3 pracovné dni"
      : "Doručenie po naskladnení",
    stockAmount,
    isInStock,
    offerSource: source,
    unitLabel: asString(source?.unit),
    currentAmount,
    standardAmount,
    actionAmount,
    hasActiveDiscount,
  };
};

const stripHtml = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const resolveGalleryItems = (
  imageUrls: string[],
  title: string | null | undefined,
): GalleryItem[] => {
  if (imageUrls.length === 0) {
    return [
      {
        id: "gallery-fallback",
        src: PRODUCT_FALLBACK_IMAGE,
        alt: title || "Produkt",
      },
    ];
  }

  return imageUrls.map((imageUrl, index) => ({
    id: `gallery-${index}`,
    src: imageUrl,
    alt: title ? `${title} (${index + 1})` : `Produkt (${index + 1})`,
  }));
};

const resolveProductHighlights = (
  summaryText: string,
  categories: HttpTypes.StoreProductCategory[],
): string[] => {
  const sentenceCandidates = summaryText
    .split(/[\.\!\?]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 3);

  if (sentenceCandidates.length >= 3) {
    return sentenceCandidates;
  }

  const categoryHighlights = categories
    .map((category) => normalizeCategoryName(category.name))
    .filter((name) => name.length > 0)
    .slice(0, 3)
    .map((name) => `Vhodné pre oblasť ${name.toLowerCase()}`);

  const merged = [...sentenceCandidates];
  for (const categoryHighlight of categoryHighlights) {
    if (merged.length >= 3) {
      break;
    }
    merged.push(categoryHighlight);
  }

  if (merged.length > 0) {
    return merged;
  }

  return [
    "Obnovuje funkciu bunky.",
    "Posilnenie obranyschopnosti.",
    "Optimalizácia hladiny cholesterolu.",
  ];
};

const resolveDisplayOriginalAmount = (
  priceState: ProductPriceState | null,
  offerState: ProductOfferState,
): number | null => {
  if (!priceState?.currentAmount) {
    return null;
  }

  const variantOriginalAmount = priceState.originalAmount;
  if (
    typeof variantOriginalAmount === "number" &&
    variantOriginalAmount > priceState.currentAmount
  ) {
    return variantOriginalAmount;
  }

  const offerStandardAmount = offerState.standardAmount;
  if (
    typeof offerStandardAmount === "number" &&
    offerStandardAmount > priceState.currentAmount
  ) {
    return offerStandardAmount;
  }

  return null;
};

const resolveDiscountPercent = (
  currentAmount: number | null,
  originalAmount: number | null,
): number | null => {
  if (
    typeof currentAmount !== "number" ||
    typeof originalAmount !== "number" ||
    originalAmount <= currentAmount ||
    originalAmount <= 0
  ) {
    return null;
  }

  return Math.round(((originalAmount - currentAmount) / originalAmount) * 100);
};

const resolveVipCreditLabel = (
  currentAmount: number | null,
  currencyCode: string,
): string | null => {
  if (typeof currentAmount !== "number") {
    return null;
  }

  return formatCurrencyAmount(currentAmount * 0.02, currencyCode);
};

const resolveVolumeDiscountOptions = (
  currentAmount: number | null,
  currencyCode: string,
): VolumeDiscountOption[] => {
  if (typeof currentAmount !== "number") {
    return [];
  }

  const options = [
    { quantity: 2, ratio: 0.95 },
    { quantity: 3, ratio: 0.9 },
  ];

  return options.map((option) => {
    const discountedUnitAmount = currentAmount * option.ratio;
    const discountedTotalAmount = discountedUnitAmount * option.quantity;
    const originalTotalAmount = currentAmount * option.quantity;

    return {
      id: `quantity-tier-${option.quantity}`,
      title: `Kúpte ${option.quantity} a ušetrite`,
      quantity: option.quantity,
      totalAmountLabel: formatCurrencyAmount(discountedTotalAmount, currencyCode),
      perUnitLabel: `${formatCurrencyAmount(discountedUnitAmount, currencyCode)} / kus`,
      oldTotalAmountLabel:
        discountedTotalAmount < originalTotalAmount
          ? formatCurrencyAmount(originalTotalAmount, currencyCode)
          : null,
    };
  });
};

const escapeHtmlAttribute = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const parseTagAttributes = (rawAttributes: string) => {
  const attributes: Array<{ name: string; value: string }> = [];
  const attributePattern =
    /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match = attributePattern.exec(rawAttributes);
  while (match) {
    const name = match[1]?.toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    if (name) {
      attributes.push({ name, value });
    }

    match = attributePattern.exec(rawAttributes);
  }

  return attributes;
};

const sanitizeHtml = (html: string): string => {
  if (!html) {
    return "";
  }

  const cleanedHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "");

  const sanitized = cleanedHtml.replace(
    /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g,
    (_, closingSlash: string, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();

      if (!ALLOWED_HTML_TAGS.has(tag)) {
        return "";
      }

      const isClosingTag = closingSlash === "/";
      if (isClosingTag) {
        return `</${tag}>`;
      }

      const allowedAttributesForTag =
        ALLOWED_TAG_ATTRIBUTES[tag] ?? new Set<string>();

      const sanitizedAttributes: string[] = [];
      let sanitizedHref: string | null = null;
      let targetValue: string | null = null;
      let relValue: string | null = null;

      for (const attribute of parseTagAttributes(rawAttributes ?? "")) {
        const { name, value } = attribute;

        if (
          !ALLOWED_GLOBAL_ATTRIBUTES.has(name) &&
          !allowedAttributesForTag.has(name)
        ) {
          continue;
        }

        if (tag === "a" && name === "href") {
          const hasSafeHref = /^(https?:|mailto:|tel:|\/|#)/i.test(value);
          if (!hasSafeHref) {
            continue;
          }

          sanitizedHref = value;
          continue;
        }

        if (tag === "a" && name === "target") {
          targetValue = value;
          continue;
        }

        if (tag === "a" && name === "rel") {
          relValue = value;
          continue;
        }

        if (!value) {
          continue;
        }

        sanitizedAttributes.push(`${name}="${escapeHtmlAttribute(value)}"`);
      }

      if (tag === "a") {
        if (sanitizedHref) {
          sanitizedAttributes.push(`href="${escapeHtmlAttribute(sanitizedHref)}"`);

          if (/^https?:/i.test(sanitizedHref)) {
            sanitizedAttributes.push("target=\"_blank\"");
            sanitizedAttributes.push("rel=\"noopener noreferrer\"");
          } else {
            if (targetValue) {
              sanitizedAttributes.push(
                `target="${escapeHtmlAttribute(targetValue)}"`,
              );
            }

            if (relValue) {
              sanitizedAttributes.push(`rel="${escapeHtmlAttribute(relValue)}"`);
            }
          }
        }
      }

      const attributesString =
        sanitizedAttributes.length > 0 ? ` ${sanitizedAttributes.join(" ")}` : "";

      if (tag === "br") {
        return `<${tag}${attributesString}>`;
      }

      const isSelfClosing = /\/\s*$/.test(rawAttributes ?? "");
      if (isSelfClosing) {
        return `<${tag}${attributesString} />`;
      }

      return `<${tag}${attributesString}>`;
    },
  );

  return sanitized.trim();
};

const resolveProductContentSections = (
  product: StorefrontProduct | null,
  shortDescriptionHtml: string,
): ProductDetailContentSection[] => {
  const metadata = asRecord(product?.metadata);
  const sectionMap = asRecord(metadata?.content_sections_map);
  const sectionsFromList = Array.isArray(metadata?.content_sections)
    ? metadata.content_sections
    : [];

  const sectionHtmlByKey = new Map<string, string>();
  for (const section of sectionsFromList) {
    const sectionRecord = asRecord(section);
    if (!sectionRecord) {
      continue;
    }

    const key = normalizeSectionKey(sectionRecord.key);
    const html = asString(sectionRecord.html);
    if (!key || !html) {
      continue;
    }

    if (!sectionHtmlByKey.has(key)) {
      sectionHtmlByKey.set(key, html);
    }
  }

  const fallbackHtml = [shortDescriptionHtml, asString(product?.description)]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  return PRODUCT_DETAIL_SECTION_ORDER.map((sectionKey) => {
    let html =
      asString(sectionMap?.[sectionKey]) ?? sectionHtmlByKey.get(sectionKey) ?? "";

    if (!html && sectionKey === "description") {
      html = fallbackHtml;
    }

    return {
      key: sectionKey,
      title: PRODUCT_DETAIL_SECTION_TITLES[sectionKey] ?? "Obsah",
      html,
    };
  });
};

const fillSectionProducts = (
  products: HttpTypes.StoreProduct[],
  sectionIndex: number,
): HttpTypes.StoreProduct[] => {
  if (products.length === 0) {
    return [];
  }

  const start = sectionIndex * RELATED_PRODUCTS_PER_SECTION;
  const initialSlice = products.slice(start, start + RELATED_PRODUCTS_PER_SECTION);

  if (initialSlice.length >= RELATED_PRODUCTS_PER_SECTION) {
    return initialSlice;
  }

  const sectionProducts = [...initialSlice];
  const usedIds = new Set(sectionProducts.map((product) => product.id));

  for (const product of products) {
    if (sectionProducts.length >= RELATED_PRODUCTS_PER_SECTION) {
      break;
    }

    if (usedIds.has(product.id)) {
      continue;
    }

    sectionProducts.push(product);
    usedIds.add(product.id);
  }

  return sectionProducts;
};

const resolveRelatedSections = (
  products: HttpTypes.StoreProduct[],
): RelatedProductsSection[] => {
  return RELATED_SECTION_TITLES.map((title, sectionIndex) => {
    return {
      id: `related-${sectionIndex}`,
      title,
      products: fillSectionProducts(products, sectionIndex),
    };
  }).filter((section) => section.products.length > 0);
};

function ProductDetailSkeleton() {
  return (
    <section className="rounded-xl border border-border-secondary bg-surface p-600">
      <div className="grid gap-600 xl:grid-cols-2">
        <Skeleton.Rectangle className="aspect-square rounded-xl" />
        <div className="space-y-400">
          <Skeleton.Text noOfLines={2} />
          <Skeleton.Rectangle className="h-500 w-900 rounded-lg" />
          <Skeleton.Text noOfLines={5} />
        </div>
      </div>
    </section>
  );
}

type HtmlContentProps = {
  html: string;
  fallback: string;
};

function HtmlContent({ html, fallback }: HtmlContentProps) {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  if (!sanitizedHtml) {
    return <p className="text-sm leading-relaxed text-fg-secondary">{fallback}</p>;
  }

  return (
    <div
      className="space-y-300 text-sm leading-relaxed text-fg-secondary"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export function StorefrontProductDetail({ handle }: StorefrontProductDetailProps) {
  const region = useRegionContext();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVolumeDiscountId, setSelectedVolumeDiscountId] = useState<string | null>(null);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const productQuery = useProduct({
    handle,
    enabled: Boolean(region?.region_id),
    fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
  });

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const addLineItemMutation = useAddLineItem();
  const prefetchProduct = usePrefetchProduct({
    defaultDelay: 220,
    skipMode: "any",
  });

  const product = (productQuery.product ?? null) as StorefrontProduct | null;

  const productImages = useMemo(() => resolveProductImages(product), [product]);
  const galleryItems = useMemo(
    () => resolveGalleryItems(productImages, product?.title),
    [product?.title, productImages],
  );
  const relatedCategoryIds = useMemo(() => resolveRelatedCategoryIds(product), [product]);

  const shortDescriptionHtml = useMemo(() => {
    const metadata = asRecord(product?.metadata);
    return asString(metadata?.short_description) ?? "";
  }, [product?.metadata]);

  const productSummaryText = useMemo(() => {
    const shortText = stripHtml(shortDescriptionHtml);
    if (shortText) {
      return shortText;
    }

    const descriptionText = stripHtml(product?.description);

    return descriptionText || "Popis produktu bude čoskoro doplnený.";
  }, [product?.description, shortDescriptionHtml]);

  const productContentSections = useMemo(
    () => resolveProductContentSections(product, shortDescriptionHtml),
    [product, shortDescriptionHtml],
  );
  const defaultInfoSectionValue = productContentSections[0]?.key ?? "description";

  const variants = product?.variants ?? [];

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) {
      return null;
    }

    return variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  }, [selectedVariantId, variants]);

  const offerState = useMemo(
    () => resolveOfferState(product, selectedVariant),
    [product, selectedVariant],
  );

  const productPrice = useMemo(() => {
    if (!product) {
      return null;
    }

    return resolvePriceState(product, selectedVariantId);
  }, [product, selectedVariantId]);

  const productHighlights = useMemo(
    () => resolveProductHighlights(productSummaryText, product?.categories ?? []),
    [product?.categories, productSummaryText],
  );

  const displayOriginalAmount = useMemo(
    () => resolveDisplayOriginalAmount(productPrice, offerState),
    [offerState, productPrice],
  );
  const displayOriginalLabel = useMemo(() => {
    if (!productPrice || typeof displayOriginalAmount !== "number") {
      return null;
    }

    return formatCurrencyAmount(displayOriginalAmount, productPrice.currencyCode);
  }, [displayOriginalAmount, productPrice]);
  const discountPercent = useMemo(
    () =>
      resolveDiscountPercent(
        productPrice?.currentAmount ?? offerState.currentAmount,
        displayOriginalAmount,
      ),
    [displayOriginalAmount, offerState.currentAmount, productPrice?.currentAmount],
  );
  const vipCreditLabel = useMemo(
    () =>
      resolveVipCreditLabel(
        productPrice?.currentAmount ?? offerState.currentAmount,
        productPrice?.currencyCode ?? "EUR",
      ),
    [offerState.currentAmount, productPrice?.currencyCode, productPrice?.currentAmount],
  );
  const volumeDiscountOptions = useMemo(
    () =>
      resolveVolumeDiscountOptions(
        productPrice?.currentAmount ?? offerState.currentAmount,
        productPrice?.currencyCode ?? "EUR",
      ),
    [offerState.currentAmount, productPrice?.currencyCode, productPrice?.currentAmount],
  );
  const selectedVolumeDiscountOption = useMemo(() => {
    if (volumeDiscountOptions.length === 0) {
      return null;
    }

    return (
      volumeDiscountOptions.find((option) => option.id === selectedVolumeDiscountId) ??
      volumeDiscountOptions[0]
    );
  }, [selectedVolumeDiscountId, volumeDiscountOptions]);

  const optionTitlesById = useMemo(() => {
    const titles = new Map<string, string>();

    for (const option of product?.options ?? []) {
      if (!option.id) {
        continue;
      }

      const title = asString(option.title);
      if (!title) {
        continue;
      }

      titles.set(option.id, title);
    }

    return titles;
  }, [product?.options]);

  const variantItems = useMemo<SelectItem[]>(() => {
    return variants
      .filter((variant): variant is HttpTypes.StoreProductVariant & { id: string } =>
        Boolean(variant.id),
      )
      .map((variant) => {
        return {
          value: variant.id,
          label: resolveVariantLabel(variant, optionTitlesById),
        };
      });
  }, [optionTitlesById, variants]);

  const relatedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    enabled: Boolean(region?.region_id && product?.id),
  });

  const relatedProducts = useMemo(() => {
    const filtered = relatedProductsQuery.products.filter(
      (relatedProduct) => relatedProduct.id !== product?.id,
    );

    return filtered.slice(0, RELATED_PRODUCTS_LIMIT);
  }, [product?.id, relatedProductsQuery.products]);

  const relatedSections = useMemo(
    () => resolveRelatedSections(relatedProducts),
    [relatedProducts],
  );

  useEffect(() => {
    setQuantity(1);
    setSelectedVariantId(product?.variants?.[0]?.id ?? null);
    setSelectedVolumeDiscountId(null);
  }, [product?.id, product?.variants]);

  useEffect(() => {
    setSelectedVolumeDiscountId(volumeDiscountOptions[0]?.id ?? null);
  }, [volumeDiscountOptions]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !product) {
      return;
    }

    const metadata = asRecord(product.metadata);

    console.info("[PDP] loaded product", {
      id: product.id,
      handle: product.handle,
      imageCount: product.images?.length ?? 0,
      categoryCount: product.categories?.length ?? 0,
      variantCount: product.variants?.length ?? 0,
      hasShortDescription: typeof metadata?.short_description === "string",
      contentSectionsCount: Array.isArray(metadata?.content_sections)
        ? metadata.content_sections.length
        : 0,
      hasContentSectionsMap:
        asRecord(metadata?.content_sections_map) !== null,
    });
  }, [product]);

  const addProductToCart = async (
    productToAdd: HttpTypes.StoreProduct,
    quantityToAdd: number,
    variantIdOverride?: string | null,
  ) => {
    setAddToCartError(null);
    setActiveProductId(productToAdd.id);

    try {
      const variantId = variantIdOverride ?? productToAdd.variants?.[0]?.id;
      if (!variantId || !region?.region_id) {
        throw new Error("Produkt nemá dostupnú variantu na pridanie do košíka.");
      }

      await addLineItemMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: quantityToAdd,
        autoCreate: true,
        region_id: region.region_id,
        country_code: region.country_code,
      });
    } catch (error) {
      setAddToCartError(resolveErrorMessage(error));
    } finally {
      setActiveProductId(null);
    }
  };

  const isBootstrappingRegion = !region?.region_id;
  const productCategories = product?.categories ?? [];

  const isMainProductAdding =
    addLineItemMutation.isPending &&
    Boolean(product?.id) &&
    activeProductId === product?.id;

  const breadcrumbItems = [
    { label: "Domov", href: "/" },
    ...(productCategories[0]?.handle
      ? [
          {
            label: normalizeCategoryName(productCategories[0].name),
            href: `/c/${productCategories[0].handle}`,
          },
        ]
      : []),
    { label: product?.title || handle },
  ];
  const currentAmount = productPrice?.currentAmount ?? offerState.currentAmount;
  const currentAmountLabel = productPrice?.currentLabel ?? "Cena na vyžiadanie";
  const currentCurrencyCode = productPrice?.currencyCode ?? "EUR";
  const unitPriceLabel =
    typeof currentAmount === "number" && offerState.unitLabel
      ? `${formatCurrencyAmount(currentAmount, currentCurrencyCode)} / ${offerState.unitLabel}`
      : null;
  const freeShippingThreshold = 49;
  const freeShippingThresholdLabel = formatCurrencyAmount(freeShippingThreshold, currentCurrencyCode);

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-600 lg:px-550">
      <Breadcrumb items={breadcrumbItems} linkAs={NextLink} />

      {isBootstrappingRegion || productQuery.isLoading ? <ProductDetailSkeleton /> : null}

      {!isBootstrappingRegion && productQuery.error ? (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <ErrorText showIcon>{productQuery.error}</ErrorText>
          <Button
            onClick={() => {
              void productQuery.query.refetch();
            }}
            variant="secondary"
          >
            Skúsiť znova
          </Button>
        </section>
      ) : null}

      {!isBootstrappingRegion && !productQuery.isLoading && !productQuery.error && !product ? (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <ErrorText showIcon>Produkt sa nepodarilo nájsť.</ErrorText>
          <LinkButton as={NextLink} href="/" variant="secondary">
            Späť na domovskú stránku
          </LinkButton>
        </section>
      ) : null}

      {!isBootstrappingRegion && !productQuery.isLoading && !productQuery.error && product ? (
        <>
          <section className="rounded-xl border border-border-secondary bg-surface p-500 lg:p-600">
            <div className="grid gap-500 xl:grid-cols-2">
              <div className="space-y-300">
                <GalleryTemplate
                  aspectRatio="square"
                  fitParent
                  items={galleryItems}
                  mainClassName="overflow-hidden rounded-xl border border-border-secondary bg-overlay"
                  orientation="vertical"
                  thumbnailSize={72}
                  thumbnailsListClassName="gap-100"
                />

                <div className="grid gap-200 sm:grid-cols-3">
                  <div className="flex items-center gap-150 rounded-lg border border-border-secondary bg-surface-secondary px-250 py-200">
                    <Icon className="text-primary" icon="token-icon-check" />
                    <ExtraText className="font-semibold text-fg-primary">
                      {typeof offerState.stockAmount === "number"
                        ? `${offerState.stockAmount} ks skladom`
                        : offerState.availabilityLabel}
                    </ExtraText>
                  </div>
                  <div className="flex items-center gap-150 rounded-lg border border-border-secondary bg-surface-secondary px-250 py-200">
                    <Icon className="text-primary" icon="token-icon-check" />
                    <ExtraText className="font-semibold text-fg-primary">
                      {offerState.unitLabel
                        ? `Balenie: ${offerState.unitLabel}`
                        : "Rýchle doručenie"}
                    </ExtraText>
                  </div>
                  <div className="flex items-center gap-150 rounded-lg border border-border-secondary bg-surface-secondary px-250 py-200">
                    <Icon className="text-primary" icon="token-icon-check" />
                    <ExtraText className="font-semibold text-fg-primary">Overený produkt</ExtraText>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-300 rounded-lg border border-border-secondary bg-surface p-300">
                  <div className="space-y-100">
                    <p className="text-sm font-semibold text-fg-primary">Potrebujete poradiť?</p>
                    <ExtraText className="text-fg-secondary">
                      Kontaktujte nás, radi vám pomôžeme.
                    </ExtraText>
                    <Link as={NextLink} className="text-sm font-semibold text-primary" href="tel:+421232112345">
                      +421 2/321 123 45
                    </Link>
                  </div>
                  <LinkButton
                    as={NextLink}
                    href="/kontakt"
                    size="sm"
                    theme="outlined"
                    variant="primary"
                  >
                    Spustiť chat
                  </LinkButton>
                </div>
              </div>

              <div className="space-y-300">
                <div className="space-y-400 rounded-lg border border-border-secondary bg-surface p-400">
                  <div className="flex flex-wrap items-center justify-between gap-200">
                    <div className="flex flex-wrap items-center gap-200">
                      <ExtraText className="text-fg-tertiary">ID: {offerState.code ?? product.handle}</ExtraText>
                      {offerState.ean ? (
                        <Badge variant="outline">{`EAN ${offerState.ean}`}</Badge>
                      ) : null}
                    </div>
                    {offerState.hasActiveDiscount && discountPercent ? (
                      <Badge variant="discount">{`-${discountPercent}%`}</Badge>
                    ) : null}
                  </div>

                  <header className="space-y-250">
                    <h1 className="text-3xl font-bold leading-tight text-fg-primary">
                      {product.title}
                    </h1>

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
                      {unitPriceLabel ? (
                        <ExtraText className="text-fg-tertiary">{unitPriceLabel}</ExtraText>
                      ) : null}
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
                        setSelectedVariantId(details.value[0] ?? null);
                      }}
                      size="sm"
                      value={selectedVariant?.id ? [selectedVariant.id] : []}
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
                          setQuantity(1);
                          return;
                        }

                        setQuantity(Math.floor(value));
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
                      disabled={!selectedVariant?.id || isMainProductAdding}
                      onClick={() => {
                        void addProductToCart(product, quantity, selectedVariant?.id);
                      }}
                      variant="primary"
                    >
                      {isMainProductAdding ? "Pridávam..." : "Pridať do košíka"}
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

                {volumeDiscountOptions.length > 0 ? (
                  <section className="space-y-250 rounded-lg border border-border-secondary bg-surface p-300">
                    <h2 className="text-xl font-semibold text-fg-primary">Množstevná zľava</h2>
                    <div className="space-y-200">
                      {volumeDiscountOptions.map((option) => {
                        const isSelected = selectedVolumeDiscountOption?.id === option.id;

                        return (
                          <Button
                            className={`w-full rounded-lg border p-300 text-left ${
                              isSelected
                                ? "border-primary bg-highlight"
                                : "border-border-secondary bg-surface-secondary"
                            }`}
                            key={option.id}
                            onClick={() => setSelectedVolumeDiscountId(option.id)}
                            theme="unstyled"
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-300">
                              <div className="flex items-start gap-200">
                                <Icon
                                  className={isSelected ? "text-primary" : "text-fg-tertiary"}
                                  icon={isSelected ? "token-icon-check" : "token-icon-chevron-right"}
                                />
                                <div className="space-y-50">
                                  <p className="text-sm font-semibold text-fg-primary">{option.title}</p>
                                  <ExtraText className="text-fg-secondary">
                                    {option.perUnitLabel}
                                  </ExtraText>
                                </div>
                              </div>
                              <div className="space-y-50 text-right">
                                <p className="text-sm font-semibold text-fg-primary">
                                  {option.totalAmountLabel}
                                </p>
                                {option.oldTotalAmountLabel ? (
                                  <ExtraText className="text-fg-tertiary line-through">
                                    {option.oldTotalAmountLabel}
                                  </ExtraText>
                                ) : null}
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      block
                      disabled={!selectedVariant?.id || isMainProductAdding || !selectedVolumeDiscountOption}
                      onClick={() => {
                        if (!selectedVolumeDiscountOption) {
                          return;
                        }
                        void addProductToCart(
                          product,
                          selectedVolumeDiscountOption.quantity,
                          selectedVariant?.id,
                        );
                      }}
                      variant="primary"
                    >
                      {isMainProductAdding ? "Pridávam..." : "Pridať do košíka"}
                    </Button>
                  </section>
                ) : null}

                {addToCartError ? <ErrorText showIcon>{addToCartError}</ErrorText> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border-secondary bg-surface p-500 lg:p-600">
            <header className="flex flex-wrap items-center justify-between gap-300">
              <h2 className="text-xl font-semibold text-fg-primary">Hodnotenie produktu</h2>
              <div className="flex items-center gap-200">
                <Rating readOnly size="sm" value={0} />
                <ExtraText className="text-fg-tertiary">Zatiaľ bez hodnotení</ExtraText>
              </div>
            </header>

            <div className="mt-400 grid gap-300 md:grid-cols-3">
              <div className="rounded-xl border border-border-secondary bg-surface-secondary p-300">
                <ExtraText className="text-fg-tertiary">Dostupnosť</ExtraText>
                <p className="mt-100 text-sm font-semibold text-fg-primary">
                  {offerState.availabilityLabel}
                </p>
              </div>

              <div className="rounded-xl border border-border-secondary bg-surface-secondary p-300">
                <ExtraText className="text-fg-tertiary">Kategórie</ExtraText>
                <p className="mt-100 text-sm font-semibold text-fg-primary">
                  {productCategories.length > 0
                    ? `${productCategories.length} zaradení`
                    : "Bez zaradenia"}
                </p>
              </div>

              <div className="rounded-xl border border-border-secondary bg-surface-secondary p-300">
                <ExtraText className="text-fg-tertiary">Varianty</ExtraText>
                <p className="mt-100 text-sm font-semibold text-fg-primary">
                  {variants.length > 1 ? `${variants.length} možností` : "1 možnosť"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border-secondary bg-surface p-500 lg:p-600">
            <h2 className="mb-400 text-xl font-semibold text-fg-primary">Informácie o produkte</h2>

            <div className="hidden lg:block">
              <Tabs defaultValue={defaultInfoSectionValue} fitted justify="start" variant="line">
                <Tabs.List>
                  {productContentSections.map((section) => (
                    <Tabs.Trigger key={section.key} value={section.key}>
                      {section.title}
                    </Tabs.Trigger>
                  ))}
                  <Tabs.Indicator />
                </Tabs.List>

                {productContentSections.map((section) => (
                  <Tabs.Content className="pt-400" key={section.key} value={section.key}>
                    <HtmlContent
                      fallback="Obsah sekcie bude čoskoro doplnený."
                      html={section.html}
                    />
                  </Tabs.Content>
                ))}
              </Tabs>
            </div>

            <div className="lg:hidden">
              <Accordion defaultValue={[defaultInfoSectionValue]} size="sm" variant="default">
                {productContentSections.map((section) => (
                  <Accordion.Item key={section.key} value={section.key}>
                    <Accordion.Header>
                      <Accordion.Title>{section.title}</Accordion.Title>
                      <Accordion.Indicator />
                    </Accordion.Header>
                    <Accordion.Content>
                      <HtmlContent
                        fallback="Obsah sekcie bude čoskoro doplnený."
                        html={section.html}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          </section>
        </>
      ) : null}

      {!isBootstrappingRegion && product && relatedSections.length > 0
        ? relatedSections.map((section) => (
            <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-500 lg:p-600" key={section.id}>
              <header className="flex items-center justify-between gap-200">
                <h2 className="text-xl font-semibold text-fg-primary">{section.title}</h2>
                <ExtraText className="text-fg-tertiary">
                  {`Nájdené: ${section.products.length}`}
                </ExtraText>
              </header>

              <div className="grid grid-cols-2 gap-400 md:grid-cols-3 xl:grid-cols-5">
                {section.products.map((relatedProduct) => (
                  <HerbatikaProductCard
                    isAdding={
                      addLineItemMutation.isPending &&
                      activeProductId === relatedProduct.id
                    }
                    key={relatedProduct.id}
                    onAddToCart={(productToAdd) => {
                      void addProductToCart(productToAdd, 1);
                    }}
                    onProductHoverEnd={(hoveredProduct) => {
                      prefetchProduct.cancelPrefetch(
                        `${section.id}-product-${hoveredProduct.id}`,
                      );
                    }}
                    onProductHoverStart={(hoveredProduct) => {
                      if (!hoveredProduct.handle) {
                        return;
                      }

                      prefetchProduct.delayedPrefetch(
                        {
                          handle: hoveredProduct.handle,
                          fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
                        },
                        220,
                        `${section.id}-product-${hoveredProduct.id}`,
                      );
                    }}
                    product={relatedProduct}
                  />
                ))}
              </div>
            </section>
          ))
        : null}
    </main>
  );
}
