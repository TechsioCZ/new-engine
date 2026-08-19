"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import { useTranslations } from "next-intl"
import { CategorySortTabs } from "@/components/category/category-sort-tabs"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { HerbatikaProductCard } from "@/components/herbatika-product-card"
import { StorefrontLink } from "@/components/storefront-link"
import type { CollectionCatalogPage } from "@/lib/storefront/collections-route-source"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { ProductSortValue } from "@/lib/storefront/plp-query-state"
import { useAddProductToCartAction } from "@/lib/storefront/use-add-product-to-cart-action"
import { usePaginationUrlBuilder } from "@/lib/storefront/use-pagination-url-builder"
import { buildPath } from "@/lib/url/public-url"

type CollectionListingProps = Readonly<{
  activeSort: ProductSortValue
  catalog: CollectionCatalogPage
  collection: Readonly<{ id: string; title: string }>
  productPublicSlugsById: Readonly<Record<string, string>>
}>

const EMPTY_LABEL = {
  sk: "V tejto kolekcii momentálne nie sú žiadne produkty.",
  cz: "V této kolekci momentálně nejsou žádné produkty.",
  hu: "Ebben a gyűjteményben jelenleg nincsenek termékek.",
  ro: "Momentan nu există produse în această colecție.",
} as const

const HOME_LABEL = {
  sk: "Domov",
  cz: "Domů",
  hu: "Főoldal",
  ro: "Acasă",
} as const

const COLLECTIONS_LABEL = {
  sk: "Kolekcie",
  cz: "Kolekce",
  hu: "Gyűjtemények",
  ro: "Colecții",
} as const

export function CollectionListing({
  activeSort,
  catalog,
  collection,
  productPublicSlugsById,
}: CollectionListingProps) {
  const marketContext = useMarketContext()
  const region = useRegionContext()
  const t = useTranslations("catalog")
  const getPageUrl = usePaginationUrlBuilder()
  const addToCart = useAddProductToCartAction({
    countryCode: region?.country_code,
    regionId: region?.region_id,
  })

  const onSortChange = (sort: ProductSortValue) => {
    const next = new URL(window.location.href)
    next.searchParams.delete("page")
    if (sort === "recommended") {
      next.searchParams.delete("sort")
    } else {
      next.searchParams.set("sort", sort)
    }
    window.location.assign(`${next.pathname}${next.search}`)
  }

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-500 p-500 font-rubik 2xl:p-700">
      <HerbatikaBreadcrumb
        items={[
          {
            href: buildPath({ kind: "home" }, marketContext.code),
            icon: "token-icon-home",
            label: HOME_LABEL[marketContext.code],
          },
          {
            href: buildPath({ kind: "collection" }, marketContext.code),
            label: COLLECTIONS_LABEL[marketContext.code],
          },
          { label: collection.title },
        ]}
      />

      <h1 className="font-bold text-4xl text-fg-primary leading-snug">
        {collection.title}
      </h1>

      <CategorySortTabs
        activeSort={activeSort}
        onSortChange={onSortChange}
        totalProducts={catalog.count}
      />

      {catalog.products.length === 0 ? (
        <div className="rounded-lg border border-border-secondary bg-base p-400">
          <p className="text-fg-secondary text-sm">
            {EMPTY_LABEL[marketContext.code]}
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-400 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {catalog.products.map((product, index) => (
            <HerbatikaProductCard
              isAdding={addToCart.isProductAdding(product.id)}
              key={`collection-${collection.id}-${product.id}-${index}`}
              onAddToCart={(selectedProduct: HttpTypes.StoreProduct) =>
                addToCart.addProductToCart({
                  product: selectedProduct,
                  quantity: 1,
                })
              }
              product={product}
              publicSlug={productPublicSlugsById[product.id] ?? null}
            />
          ))}
        </div>
      )}

      {catalog.totalPages > 1 ? (
        <Pagination
          count={catalog.count}
          getPageUrl={getPageUrl}
          linkAs={StorefrontLink}
          page={catalog.page}
          pageSize={catalog.limit}
          size="sm"
          translations={{
            itemLabel: ({ page, totalPages }) =>
              t("pagination.page_aria", { page, totalPages }),
            nextTriggerLabel: t("pagination.next_aria"),
            prevTriggerLabel: t("pagination.previous_aria"),
            rootLabel: t("pagination.root_aria"),
          }}
          variant="outlined"
        />
      ) : null}
    </main>
  )
}
