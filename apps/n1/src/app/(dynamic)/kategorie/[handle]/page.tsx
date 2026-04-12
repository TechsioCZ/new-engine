import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { notFound } from "next/navigation"
import {
  allCategories,
} from "@/data/static/categories"
import { ALL_CATEGORIES_MAP, PRODUCT_LIMIT, VALID_CATEGORY_ROUTES } from "@/lib/constants"
import { resolveProductPagination } from "@/lib/product-query-params"
import { getStorefrontRegionSelection } from "@/lib/storefront-region"
import { storefrontServerRead } from "@/lib/storefront-server-read"
import { CategoryPageClient } from "./page-client"

type CategoryPageProps = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ page?: string | string[] }>
}

const parsePageParam = (value: string | string[] | undefined): number => {
  const resolvedValue = Array.isArray(value) ? value[0] : value
  if (resolvedValue == null) {
    return 1
  }

  const parsed = Number(resolvedValue)
  if (!Number.isFinite(parsed)) {
    return 1
  }

  return Math.max(1, Math.floor(parsed))
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { handle } = await params
  const { page } = await searchParams

  const currentCategory = allCategories.find((category) => category.handle === handle)
  const rootCategory =
    allCategories.find((category) => category.id === currentCategory?.root_category_id) ??
    currentCategory

  if (
    !(VALID_CATEGORY_ROUTES.includes(handle) && currentCategory && rootCategory)
  ) {
    notFound()
  }

  const currentPage = parsePageParam(page)
  const categoryIds = ALL_CATEGORIES_MAP[handle] ?? []
  const { limit, offset } = resolveProductPagination({
    page: currentPage,
    limit: PRODUCT_LIMIT,
  })
  const region = await getStorefrontRegionSelection()
  const queryClient = getServerQueryClient()

  await queryClient.prefetchQuery(
    storefrontServerRead.queries.products.getListQueryOptions(
      {
        category_id: categoryIds,
        limit,
        offset,
      },
      {
        region: {
          region_id: region.regionId,
          country_code: region.countryCode,
        },
      }
    )
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CategoryPageClient
        currentPage={currentPage}
        handle={handle}
        regionId={region.regionId}
        countryCode={region.countryCode}
      />
    </HydrationBoundary>
  )
}
