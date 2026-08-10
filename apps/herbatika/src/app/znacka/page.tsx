import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { BrandIndexPage } from "@/components/brands/brand-index-page"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"

export const generateMetadata = async (): Promise<Metadata> => {
  const tCatalog = await getTranslations("catalog")

  return {
    description: tCatalog("brands.metadata.index_description"),
    title: tCatalog("brands.metadata.index_title"),
  }
}

const BrandsPage = async () => {
  const brands = await fetchStorefrontBrands()

  return <BrandIndexPage brands={brands} />
}

export default BrandsPage
