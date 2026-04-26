import type {
  RelatedProductsSection,
  StorefrontProduct,
} from "@/components/product-detail/product-detail.types";
import {
  RELATED_PRODUCTS_PER_SECTION,
  RELATED_RECOMMENDATION_SECTION_TITLES,
  RECENTLY_VISITED_RELATED_SECTION_TITLE,
} from "@/components/product-detail/product-detail.constants";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeProductReferenceCode = (value: string) => value.trim();

const slugifyProductReferenceCode = (value: string) => {
  return normalizeProductReferenceCode(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const resolveProductReferenceHandle = (code: string) => {
  const slug = slugifyProductReferenceCode(code);

  return slug ? `shopitem-${slug}` : null;
};

export const resolveRelatedProductReferenceCodes = (
  product: StorefrontProduct | null,
): string[] => {
  const metadata = isRecord(product?.metadata) ? product.metadata : null;
  const codes = [
    ...asStringArray(metadata?.related_products),
    ...asStringArray(metadata?.alternative_products),
  ];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const code of codes) {
    const normalized = normalizeProductReferenceCode(code);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

export const orderProductsByReferenceCodes = (
  products: StorefrontProduct[],
  referenceCodes: string[],
): StorefrontProduct[] => {
  const productBySourceId = new Map<string, StorefrontProduct>();
  const productByHandle = new Map<string, StorefrontProduct>();
  const usedProductIds = new Set<string>();
  const result: StorefrontProduct[] = [];

  for (const product of products) {
    if (product.handle) {
      productByHandle.set(product.handle, product);
    }

    const metadata = isRecord(product.metadata) ? product.metadata : null;
    const sourceShopitemId = metadata?.source_shopitem_id;
    if (typeof sourceShopitemId === "string" && sourceShopitemId) {
      productBySourceId.set(sourceShopitemId, product);
    }
  }

  for (const code of referenceCodes) {
    const referenceHandle = resolveProductReferenceHandle(code);
    const product =
      productBySourceId.get(code) ??
      (referenceHandle ? productByHandle.get(referenceHandle) : undefined);

    if (!product?.id || usedProductIds.has(product.id)) {
      continue;
    }

    usedProductIds.add(product.id);
    result.push(product);
  }

  return result;
};

const fillSectionProducts = (
  products: StorefrontProduct[],
  sectionIndex: number,
): StorefrontProduct[] => {
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

export const resolveRelatedSections = (
  products: StorefrontProduct[],
  recentlyVisitedProducts: StorefrontProduct[] = [],
): RelatedProductsSection[] => {
  const recommendationSections = RELATED_RECOMMENDATION_SECTION_TITLES.map(
    (title, sectionIndex) => {
      return {
        id: `related-${sectionIndex}`,
        title,
        products: fillSectionProducts(products, sectionIndex),
      };
    },
  );
  const recentlyVisitedSection = {
    id: "recently-visited",
    title: RECENTLY_VISITED_RELATED_SECTION_TITLE,
    products: recentlyVisitedProducts.slice(0, RELATED_PRODUCTS_PER_SECTION),
  };

  return [...recommendationSections, recentlyVisitedSection].filter(
    (section) => section.products.length > 0,
  );
};
