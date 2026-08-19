import "server-only"

import { createBrandSlug, type StorefrontBrand } from "./brands"
import { buildCatalogProductsParams } from "./catalog-query-state"
import { getRegionServerContext } from "./ssr/context"
import { fetchServerCatalogProducts } from "./storefront-server"

export const fetchStorefrontBrands = async (): Promise<StorefrontBrand[]> => {
  const { queryClient, region } = await getRegionServerContext()
  if (!region) {
    return []
  }

  const response = await fetchServerCatalogProducts(
    queryClient,
    buildCatalogProductsParams({
      queryState: {
        page: 1,
        q: "",
        sort: "recommended",
        status: [],
        form: [],
        brand: [],
        ingredient: [],
        price_min: null,
        price_max: null,
      },
      limit: 1,
      regionId: region.region_id,
      countryCode: region.country_code,
      salesChannelId: region.salesChannelId,
    })
  )
  const brands = response.facets.brand.flatMap((facet) => {
    const slug = createBrandSlug(facet.label)

    return slug
      ? [
          {
            id: facet.id,
            title: facet.label,
            handle: slug,
            slug,
            facetId: facet.id,
          },
        ]
      : []
  })

  const brandsBySlug = new Map<string, StorefrontBrand>()
  for (const brand of brands) {
    if (!brandsBySlug.has(brand.slug)) {
      brandsBySlug.set(brand.slug, brand)
    }
  }

  return Array.from(brandsBySlug.values())
}
