import { HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { BrandListing } from "@/components/brands/brand-listing"
import { createBrandHref, resolveBrandBySlug } from "@/lib/storefront/brands"
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchBrandPageStorefrontData } from "@/lib/storefront/ssr"

type BrandPageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const resolveBrandPageData = async (slug: string) => {
  const brands = await fetchStorefrontBrands()
  return resolveBrandBySlug(brands, slug)
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
  const brand = await resolveBrandPageData(slug)

  if (!brand) {
    return {
      title: "Značka | Herbatica",
    }
  }

  return {
    title: `${brand.title} | Značky Herbatica`,
    description: `Produkty značky ${brand.title} dostupné v e-shope Herbatica.`,
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
  const brand = await resolveBrandPageData(slug)

  if (!brand) {
    notFound()
  }

  if (slug !== brand.slug) {
    redirect(
      `${createBrandHref(brand)}${createSearchParamsSuffix(resolvedSearchParams)}`
    )
  }

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams)
  const { dehydratedState } = await prefetchBrandPageStorefrontData(
    brand.facetId,
    queryState
  )

  return (
    <HydrationBoundary state={dehydratedState}>
      <BrandListing brandFacetId={brand.facetId} brandTitle={brand.title} />
    </HydrationBoundary>
  )
}
