import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { BrandIndexPage } from "@/components/brands/brand-index-page"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"

export async function generateMetadata(): Promise<Metadata> {
  const tCatalog = await getTranslations("catalog")

  return {
    title: tCatalog("brands.metadata.index_title"),
    description: tCatalog("brands.metadata.index_description"),
  }
}

export default async function BrandsPage() {
  const brands = await fetchStorefrontBrands()

  return <BrandIndexPage brands={brands} />
}
