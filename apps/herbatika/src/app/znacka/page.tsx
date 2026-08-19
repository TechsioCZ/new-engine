import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { BrandIndexPage } from "@/components/brands/brand-index-page"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"

export async function generateMetadata(): Promise<Metadata> {
  const tCatalog = await getTranslations("catalog")

  return {
    title: tCatalog("brands.metadata.index_title"),
    description: tCatalog("brands.metadata.index_description"),
  }
}

export default async function BrandsPage() {
  const { code: market } = await getMarketServerContext()
  const brands = await fetchStorefrontBrands(market)

  return (
    <BrandIndexPage
      brands={brands.map((brand) => ({
        ...brand,
        publicSlug: brand.facetId.slice("brand-".length),
      }))}
    />
  )
}
