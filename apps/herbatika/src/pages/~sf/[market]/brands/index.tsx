import type { GetServerSideProps } from "next"
import { BrandIndexPage } from "@/components/brands/brand-index-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  foundSource,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import type { StorefrontBrand } from "@/lib/storefront/brands"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import { readCompletePublicEntitySlugs } from "@/lib/storefront/ssr/public-entity-projections"

type Props = PublicPageProps<
  Readonly<{
    brands: readonly (StorefrontBrand & { publicSlug: string })[]
  }>
>

export const getServerSideProps = (async (context) =>
  resolveStaticPublicPage(context, {
    expectedRouteKey: "brand.index",
    loadSource: async (market) => {
      const brands = await fetchStorefrontBrands(market)
      const publicSlugs = await readCompletePublicEntitySlugs({
        kind: "brand",
        market,
        rejectUnexpectedSourceIds: true,
        requiredSourceIds: brands.map((brand) => brand.id),
      })
      if (publicSlugs.kind !== "found") {
        return publicSlugs
      }
      return foundSource({
        brands: brands.map((brand) => ({
          ...brand,
          publicSlug: publicSlugs.value[brand.id],
        })),
      })
    },
    path: { kind: "brand" },
    queryKind: "brand-index",
  })) satisfies GetServerSideProps<Props>

export default function BrandsPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="catalog" />
  }
  return <BrandIndexPage brands={[...page.value.brands]} />
}
