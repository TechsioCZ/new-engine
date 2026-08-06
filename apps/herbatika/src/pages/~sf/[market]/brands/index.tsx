import type { GetServerSideProps } from "next"
import { BrandIndexPage } from "@/components/brands/brand-index-page"
import {
  type IndexPageProps,
  resolveIndexPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import type { StorefrontBrand } from "@/lib/storefront/brands"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"

type Props = IndexPageProps<StorefrontBrand[]>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveIndexPage(context, "brand", async () => ({
    type: "found",
    value: await fetchStorefrontBrands(),
  }))
export default function BrandsPage({ marketContext, source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return <BrandIndexPage brands={source ?? []} market={marketContext.code} />
}
