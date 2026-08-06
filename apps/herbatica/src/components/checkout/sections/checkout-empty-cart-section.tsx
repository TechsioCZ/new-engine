"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { InlineProductsCarousel } from "@/components/blog/inline-products-carousel"
import { SupportingText } from "@/components/text/supporting-text"
import { useCategories } from "@/lib/storefront/categories"
import {
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree"
import { RELATED_PRODUCT_FIELDS, useProducts } from "@/lib/storefront/products"
import { selectRecommendedProductRepresentatives } from "@/lib/storefront/recommended-product-families"

const EMPTY_CART_RECOMMENDATIONS_CATEGORY_HANDLE = "novinky"
const EMPTY_CART_RECOMMENDATIONS_LIMIT = 10
const EMPTY_CART_RECOMMENDATIONS_CANDIDATE_LIMIT = 32

export function CheckoutEmptyCartSection() {
  const tCheckout = useTranslations("checkout")
  const region = useRegionContext()
  const categoriesQuery = useCategories({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
  })

  const recommendationCategory = categoriesQuery.categories.find(
    (category) => category.handle === EMPTY_CART_RECOMMENDATIONS_CATEGORY_HANDLE
  )

  const recommendationCategoryIds = recommendationCategory
    ? [
        recommendationCategory.id,
        ...collectDescendantCategoryIds(
          categoriesQuery.categories,
          recommendationCategory.id
        ),
      ]
    : []

  const recommendationsQuery = useProducts({
    page: 1,
    limit: EMPTY_CART_RECOMMENDATIONS_CANDIDATE_LIMIT,
    order: "-created_at",
    fields: RELATED_PRODUCT_FIELDS,
    category_id:
      recommendationCategoryIds.length > 0
        ? recommendationCategoryIds
        : undefined,
    enabled: Boolean(region?.region_id && recommendationCategoryIds.length > 0),
  })
  const recommendedProducts = selectRecommendedProductRepresentatives(
    recommendationsQuery.products,
    EMPTY_CART_RECOMMENDATIONS_LIMIT
  )

  return (
    <section className="space-y-800">
      <div className="mt-600 grid items-center gap-450">
        <div className="flex flex-col items-center gap-350">
          <Icon
            icon="token-icon-cart text-[128px] text-primary"
            size="current"
          />

          <div className="min-w-0 space-y-300">
            <div className="space-y-150">
              <h2 className="font-bold text-2xl text-fg-primary leading-tight">
                {tCheckout("empty_cart_title")}
              </h2>
              <SupportingText className="max-w-3xl">
                {tCheckout("empty_cart_description")}
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
                {tCheckout("empty_cart_browse_new_products")}
              </LinkButton>
              <LinkButton
                as={NextLink}
                className="w-full sm:w-auto"
                href="/"
                size="md"
                theme="outlined"
                variant="secondary"
              >
                {tCheckout("empty_cart_home")}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
      {recommendedProducts.length > 0 ? (
        <section className="space-y-300">
          <h2 className="px-300 font-semibold text-2xl text-fg-primary leading-tight">
            {tCheckout("empty_cart_recommendations_title")}
          </h2>

          <InlineProductsCarousel products={recommendedProducts} slidesLg={4} />
        </section>
      ) : null}
    </section>
  )
}
