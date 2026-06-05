import type { HttpTypes } from "@medusajs/types";
import {
  PRODUCT_DETAIL_SECTION_ORDER,
  PRODUCT_DETAIL_SECTION_TITLES,
  PRODUCT_FALLBACK_IMAGE,
} from "@/components/product-detail/product-detail.constants";
import type {
  ProductDetailContentSection,
  ProductOfferState,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types";
import {
  hasRenderableHtmlContent,
  stripHtml,
} from "@/components/product-detail/utils/html-sanitizer";
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils";
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability";

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

const hasRenderableSectionHtml = (html: string): boolean => {
  return hasRenderableHtmlContent(html);
};

const toSkDate = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const addBusinessDays = (start: Date, daysToAdd: number) => {
  const date = new Date(start);
  let remainingDays = daysToAdd;

  while (remainingDays > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays -= 1;
    }
  }

  return date;
};

const resolveInStockDeliveryLabel = () => {
  const deliveryDate = addBusinessDays(new Date(), 3);
  return `u vás do ${toSkDate(deliveryDate)}`;
};

export const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
};

export const resolveProductImages = (product: StorefrontProduct | null): string[] => {
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

export const resolveVariantLabel = (
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

export const resolveOfferState = (
  product: StorefrontProduct | null,
  selectedVariant: HttpTypes.StoreProductVariant | null,
): ProductOfferState => {
  const metadata = asRecord(product?.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const variantMetadata = asRecord(selectedVariant?.metadata);
  const source = topOffer ?? variantMetadata;
  const stock = asRecord(source?.stock);
  const variantInventory = resolveVariantInventoryState(selectedVariant);
  const stockAmount =
    variantInventory.availableQuantity ?? asNumber(stock?.amount);
  const isInStock = variantInventory.isInStock;

  const inStockLabel = asString(source?.availability_in_stock) ?? "Skladom";
  const outOfStockLabel =
    asString(source?.availability_out_of_stock) ?? "Momentálne nie je skladom";
  const currentAmount =
    asNumber(source?.current_price) ?? asNumber(source?.price_vat);

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
      ? resolveInStockDeliveryLabel()
      : "po naskladnení",
    stockAmount,
    isInStock,
    offerSource: source,
    unitLabel: asString(source?.unit),
    currentAmount,
    standardAmount: asNumber(source?.standard_price),
    actionAmount,
    hasActiveDiscount,
    applyLoyaltyDiscount: asBoolean(source?.apply_loyalty_discount) === true,
    applyQuantityDiscount: asBoolean(source?.apply_quantity_discount) === true,
    applyVolumeDiscount: asBoolean(source?.apply_volume_discount) === true,
  };
};

export const resolveProductContentSections = (
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
    if (!key || !html || sectionHtmlByKey.has(key)) {
      continue;
    }

    sectionHtmlByKey.set(key, html);
  }

  const fallbackHtml = [shortDescriptionHtml, asString(product?.description)]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  const sections = PRODUCT_DETAIL_SECTION_ORDER.map((sectionKey) => {
    let html =
      sectionHtmlByKey.get(sectionKey) ?? asString(sectionMap?.[sectionKey]) ?? "";

    if (!html && sectionKey === "description") {
      html = fallbackHtml;
    }

    return {
      key: sectionKey,
      title: PRODUCT_DETAIL_SECTION_TITLES[sectionKey] ?? "Obsah",
      html,
    };
  }).filter((section) => hasRenderableSectionHtml(section.html));

  if (sections.length > 0) {
    return sections;
  }

  return [
    {
      key: "description",
      title: PRODUCT_DETAIL_SECTION_TITLES.description,
      html: fallbackHtml,
    },
  ];
};
