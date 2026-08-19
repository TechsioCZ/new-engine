import { HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { BrandListing } from "@/components/brands/brand-listing"
import {
  createBrandFacetId,
  type StorefrontBrand,
} from "@/lib/storefront/brands"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchBrandPageStorefrontData } from "@/lib/storefront/ssr"

type BrandPageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const BRAND_FACET_PREFIX = "brand-"

const resolveLegacyBrandBySlug = (
  brands: readonly StorefrontBrand[],
  slug: string
) => {
  const facetId = createBrandFacetId(slug)
  return (
    brands.find((brand) => brand.facetId === facetId) ??
    brands.find((brand) => createBrandFacetId(brand.title) === facetId) ??
    null
  )
}

const resolveBrandPageData = async (slug: string) => {
  const { code: market } = await getMarketServerContext()
  const brands = await fetchStorefrontBrands(market)
  return { brand: resolveLegacyBrandBySlug(brands, slug), market }
}

const createSearchParamsSuffix = (
  searchParams: Record<string, string | string[] | undefined>
) => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
      continue
    }

    if (value !== undefined) {
      params.set(key, value)
    }
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ""
}

export async function generateMetadata({
  params,
}: Pick<BrandPageProps, "params">): Promise<Metadata> {
  const { slug } = await params
  const [{ brand }, tCatalog] = await Promise.all([
    resolveBrandPageData(slug),
    getTranslations("catalog"),
  ])

  if (!brand) {
    return {}
  }

  return {
    title: tCatalog("brands.metadata.detail_title", {
      brandName: brand.title,
    }),
    description: tCatalog("brands.metadata.detail_description", {
      brandName: brand.title,
    }),
  }
}

export default async function BrandPage({
  params,
  searchParams,
}: BrandPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const { brand, market } = await resolveBrandPageData(slug)

  if (!brand) {
    notFound()
  }

  const canonicalSlug = brand.facetId.slice(BRAND_FACET_PREFIX.length)
  if (slug !== canonicalSlug) {
    redirect(
      `/znacka/${canonicalSlug}${createSearchParamsSuffix(resolvedSearchParams)}`
    )
  }

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams)
  const requestHeaders = await headers()
  const { dehydratedState } = await prefetchBrandPageStorefrontData(
    brand.facetId,
    queryState,
    { cookieHeader: requestHeaders.get("cookie") ?? undefined, market }
  )

  return (
    <HydrationBoundary state={dehydratedState}>
      <BrandListing brandFacetId={brand.facetId} brandTitle={brand.title} />
    </HydrationBoundary>
  )
}
