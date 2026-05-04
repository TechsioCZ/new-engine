"use client";

import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import NextLink from "next/link";
import { useMemo } from "react";
import { InlineProductsCarousel } from "@/components/blog/inline-products-carousel";
import { SupportingText } from "@/components/text/supporting-text";
import {
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config";
import { useCategories } from "@/lib/storefront/categories";
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree";
import {
  STOREFRONT_RELATED_PRODUCT_FIELDS,
  useProducts,
} from "@/lib/storefront/products";
import { selectRecommendedProductRepresentatives } from "@/lib/storefront/recommended-product-families";

const EMPTY_CART_RECOMMENDATIONS_CATEGORY_HANDLE = "novinky";
const EMPTY_CART_RECOMMENDATIONS_LIMIT = 10;
const EMPTY_CART_RECOMMENDATIONS_CANDIDATE_LIMIT = 32;

export function CheckoutEmptyCartSection() {
  const region = useRegionContext();
  const categoriesQuery = useCategories({
    page: 1,
    limit: STOREFRONT_CATEGORY_TREE_LIMIT,
    fields: STOREFRONT_CATEGORY_TREE_FIELDS,
  });

  const recommendationCategoryIds = useMemo(() => {
    const recommendationCategory = categoriesQuery.categories.find(
      (category) =>
        category.handle === EMPTY_CART_RECOMMENDATIONS_CATEGORY_HANDLE,
    );

    if (!recommendationCategory) {
      return [];
    }

    return [
      recommendationCategory.id,
      ...collectDescendantCategoryIds(
        categoriesQuery.categories,
        recommendationCategory.id,
      ),
    ];
  }, [categoriesQuery.categories]);

  const recommendationsQuery = useProducts({
    page: 1,
    limit: EMPTY_CART_RECOMMENDATIONS_CANDIDATE_LIMIT,
    order: "-created_at",
    fields: STOREFRONT_RELATED_PRODUCT_FIELDS,
    category_id:
      recommendationCategoryIds.length > 0
        ? recommendationCategoryIds
        : undefined,
    enabled: Boolean(region?.region_id && recommendationCategoryIds.length > 0),
  });
  const recommendedProducts = useMemo(
    () =>
      selectRecommendedProductRepresentatives(
        recommendationsQuery.products,
        EMPTY_CART_RECOMMENDATIONS_LIMIT,
      ),
    [recommendationsQuery.products],
  );

  return (
    <section className="space-y-800">
      <div className="grid gap-450 items-center mt-600">
        <div className="flex flex-col items-center gap-350">
            <Icon icon="token-icon-cart text-[128px] text-primary" size="current" />

          <div className="min-w-0 space-y-300">
            <div className="space-y-150">
              <h2 className="text-2xl leading-tight font-bold text-fg-primary">
                Košík je prázdny
              </h2>
              <SupportingText className="max-w-3xl">
                Vyberte si z noviniek alebo pokračujte na domovskú stránku.
                Objednávku dokončíte hneď po pridaní produktu.
              </SupportingText>
            </div>

            <div className="flex flex-col gap-200 sm:flex-row sm:flex-wrap">
              <LinkButton
                as={NextLink}
                className="w-full sm:w-auto"
                href="/c/novinky"
                size="md"
                variant="primary"
              >
                Prezrieť novinky
              </LinkButton>
              <LinkButton
                as={NextLink}
                className="w-full sm:w-auto"
                href="/"
                size="md"
                theme="outlined"
                variant="secondary"
              >
                Ísť na domovskú stránku
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
      {recommendedProducts.length > 0 ? (
        <section className="space-y-300">
          <h2 className="px-300 text-2xl leading-tight font-semibold text-fg-primary">
            Novinky, ktoré si môžete pridať do košíka
          </h2>

          <InlineProductsCarousel products={recommendedProducts} slidesLg={4} />
        </section>
      ) : null}
    </section>
  );
}
