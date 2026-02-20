import type { StorefrontProduct, RelatedProductsSection } from "@/components/product-detail/product-detail.types";
import {
  RELATED_PRODUCTS_PER_SECTION,
  RELATED_SECTION_TITLES,
} from "@/components/product-detail/product-detail.constants";

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
): RelatedProductsSection[] => {
  return RELATED_SECTION_TITLES.map((title, sectionIndex) => {
    return {
      id: `related-${sectionIndex}`,
      title,
      products: fillSectionProducts(products, sectionIndex),
    };
  }).filter((section) => section.products.length > 0);
};
