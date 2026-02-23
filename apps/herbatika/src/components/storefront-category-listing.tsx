"use client";

import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import {
  CategoryContextPanel,
} from "@/components/category/category-context-panel";
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel";
import { CategoryHeader } from "@/components/category/category-header";
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants";
import { normalizeCategoryName } from "@/components/category/category-product-utils";
import { CategoryResultsSection } from "@/components/category/category-results-section";
import { CategoryTopLevelLinks } from "@/components/category/category-top-level-links";
import { useCategoryListingController } from "@/components/category/use-category-listing-controller";
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state";

type StorefrontCategoryListingProps = {
  slug: string;
};

export function StorefrontCategoryListing({
  slug,
}: StorefrontCategoryListingProps) {
  const controller = useCategoryListingController({ slug });
  const isResultsLoading =
    controller.categoriesQuery.isLoading || controller.catalogQuery.isLoading;
  const isTrapiMaCategory = slug === "trapi-ma";
  const fallbackCategoryTitle = isTrapiMaCategory ? "Trápi ma" : slug;
  const categoryTitle = normalizeCategoryName(
    controller.activeCategory?.name ?? fallbackCategoryTitle,
  );
  const immunityHref = "/c/trapi-ma-imunita-a-obranyschopnost";
  const skinProblemsHref = "/c/trapi-ma-kozne-problemy";
  const jointsHref = "/c/trapi-ma-klby-a-pohybovy-aparat";
  const supplementsHref = "/c/doplnky-vyzivy";

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 p-600">
      <Breadcrumb items={controller.breadcrumbItems} linkAs={NextLink} />

      {isTrapiMaCategory ? (
        <section>
          <h1 className="text-4xl font-bold leading-snug text-fg-primary">
            {categoryTitle}
          </h1>
        </section>
      ) : (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <CategoryHeader
            activeAsideFilterCount={controller.activeAsideFilterCount}
            categoryFound={Boolean(controller.activeCategory)}
            categorySubtitle={controller.categorySubtitle}
            displayedProductsCount={controller.catalogQuery.totalCount}
            title={categoryTitle}
            totalProducts={controller.catalogQuery.totalCount}
          />

          <CategoryTopLevelLinks
            activeCategoryHandle={controller.activeCategory?.handle ?? null}
            getCategoryLabel={(category) => normalizeCategoryName(category.name)}
            onCategoryBlur={controller.onCategoryBlur}
            onCategoryFocus={controller.onCategoryFocus}
            onCategoryMouseEnter={controller.onCategoryMouseEnter}
            onCategoryMouseLeave={controller.onCategoryMouseLeave}
            topLevelCategories={controller.topLevelCategories}
          />
        </section>
      )}

      <CategoryContextPanel
        introContent={
          isTrapiMaCategory ? (
            <>
              Človek je neoddeliteľnou súčasťou prírody, každá jedna naša bunka je s
              ňou prepojená a závislá od jej ďalších zložiek: vody, vzduchu, stromov,
              rastlín a ďalších živých tvorov na zemi. Spôsob, akým k nej
              pristupujeme, sa odráža aj na našom zdraví. Pretože byť jej súčasťou
              znamená starať sa o ňu s pokorou a láskou a ochraňovať ju. Len vtedy nám
              dokáže poskytnúť tie najväčšie dary, aby sme ich mohli využívať pre náš
              prospech.
              <br />
              Trápi vás{" "}
              <NextLink
                className="font-semibold text-primary underline underline-offset-2"
                href={immunityHref}
              >
                oslabená imunita
              </NextLink>
              ,{" "}
              <NextLink
                className="font-semibold text-primary underline underline-offset-2"
                href={skinProblemsHref}
              >
                kožné problémy
              </NextLink>
              , únava alebo{" "}
              <NextLink
                className="font-semibold text-primary underline underline-offset-2"
                href={jointsHref}
              >
                bolesti kĺbov
              </NextLink>
              ? V Herbatica sme pre vás pripravili jedinečnú kategóriu{" "}
              <strong>Trápi ma</strong>, v ktorej nájdete prírodné produkty rozdelené
              podľa účelu a oblasti zdravia. Namiesto dlhého hľadania môžete
              jednoducho kliknúť na problém, ktorý vás trápi, a objaviť odporúčané{" "}
              <NextLink
                className="font-semibold text-primary underline underline-offset-2"
                href={supplementsHref}
              >
                doplnky výživy
              </NextLink>
              .
            </>
          ) : undefined
        }
        introText={isTrapiMaCategory ? null : controller.categoryIntroText}
        tiles={isTrapiMaCategory ? [] : controller.categoryContextTiles}
      />

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
        <div className="grid gap-600 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <CategoryFacetsPanel
              activeFilterCount={controller.activeAsideFilterCount}
              brandItems={controller.asideBrandItems}
              currencyCode={controller.productsCurrencyCode}
              formItems={controller.asideFormItems}
              ingredientItems={controller.asideIngredientItems}
              isLoading={controller.isFiltersLoading}
              onBrandToggle={controller.onBrandToggle}
              onFormToggle={controller.onFormToggle}
              onIngredientToggle={controller.onIngredientToggle}
              onPriceRangeCommit={controller.onPriceRangeCommit}
              onReset={controller.onResetFilters}
              onStatusToggle={controller.onStatusToggle}
              priceBounds={controller.priceBounds}
              selectedPriceRange={controller.selectedPriceRange}
              statusItems={controller.asideStatusItems}
            />
          </div>

          <CategoryResultsSection
            activeSort={controller.queryState.sort}
            addToCartError={controller.addToCartError}
            categoriesError={controller.categoriesError}
            catalogError={controller.catalogError}
            isEmpty={controller.products.length === 0}
            isLoading={isResultsLoading}
            isProductAdding={controller.isProductAdding}
            onAddToCart={controller.onAddToCart}
            onPageChange={controller.onPageChange}
            onProductHoverEnd={controller.onProductHoverEnd}
            onProductHoverStart={controller.onProductHoverStart}
            onSortChange={controller.onSortChange}
            page={controller.page}
            pageSize={PLP_PAGE_SIZE}
            products={controller.products}
            showCategoryNotFound={controller.showCategoryNotFound}
            sortItems={SORT_TAB_ITEMS}
            totalCount={controller.catalogQuery.totalCount}
            totalPages={controller.catalogQuery.totalPages}
            totalProducts={controller.catalogQuery.totalCount}
          />
        </div>
      </section>
    </main>
  );
}
