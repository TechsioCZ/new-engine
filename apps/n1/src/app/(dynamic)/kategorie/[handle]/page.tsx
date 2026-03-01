"use client"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import NextLink from "next/link"
import {
  notFound,
  useParams,
} from "next/navigation"
import { useQueryState } from "nuqs"
import { useCallback, useEffect, useRef } from "react"
import { Banner } from "@/components/atoms/banner"
import { Heading } from "@/components/heading"
import { ProductGrid } from "@/components/molecules/product-grid"
import { N1Aside } from "@/components/n1-aside"
import {
  allCategories,
  categoryMap,
  categoryTree,
} from "@/data/static/categories"
import { usePrefetchCategoryChildren } from "@/hooks/use-prefetch-category-children"
import { usePrefetchPages } from "@/hooks/use-prefetch-pages"
import { usePrefetchRootCategories } from "@/hooks/use-prefetch-root-categories"
import { useProducts } from "@/hooks/use-products"
import { useSuspenseRegion } from "@/hooks/use-region"
import {
  ALL_CATEGORIES_MAP,
  PRODUCT_LIMIT,
  VALID_CATEGORY_ROUTES,
} from "@/lib/constants"
import { parseAsPositivePageWithDefault } from "@/lib/url-state/parsers"
import { useAnalytics } from "@/providers/analytics-provider"
import { transformProduct } from "@/utils/transform/transform-product"

export default function CategoryPage() {
  const params = useParams()
  const handle = params.handle as string
  const { regionId, countryCode } = useSuspenseRegion()
  const analytics = useAnalytics()
  const [currentPage, setPage] = useQueryState(
    "page",
    parseAsPositivePageWithDefault
  )

  // Track which category we've already tracked to prevent duplicates
  const trackedCategoryId = useRef<string | null>(null)

  const currentCategory = allCategories.find((cat) => cat.handle === handle)
  const currentCategoryChildren = allCategories.filter(
    (cat) => cat.parent_category_id === currentCategory?.id
  )
  const rootCategory =
    allCategories.find((cat) => cat.id === currentCategory?.root_category_id) ??
    currentCategory

  const buildCategoryPath = useCallback((): string | null => {
    if (!currentCategory) {
      return null
    }

    const path: string[] = []
    let current: typeof currentCategory | undefined = currentCategory

    while (current) {
      path.unshift(current.name)
      current = allCategories.find((c) => c.id === current?.parent_category_id)
    }

    return path.join(" > ")
  }, [currentCategory])

  useEffect(() => {
    if (!currentCategory) {
      return
    }
    if (trackedCategoryId.current === currentCategory.id) {
      return
    }

    const categoryPath = buildCategoryPath()
    if (categoryPath) {
      trackedCategoryId.current = currentCategory.id
      analytics.trackViewCategory({ category: categoryPath })
    }
  }, [currentCategory, analytics, buildCategoryPath])

  const isValidCategoryRoute = VALID_CATEGORY_ROUTES.includes(handle)
  const categoryIds = isValidCategoryRoute
    ? (ALL_CATEGORIES_MAP[handle] ?? [])
    : []

  const {
    products: rawProducts,
    isLoading,
    isFetching,
    totalCount,
    currentPage: responsePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = useProducts({
    category_id: categoryIds,
    page: currentPage,
    limit: PRODUCT_LIMIT,
    enabled: isValidCategoryRoute && categoryIds.length > 0,
  })

  const isCurrentPageReady =
    isValidCategoryRoute && categoryIds.length > 0 && !isLoading && !isFetching

  if (!isValidCategoryRoute) {
    notFound()
  }

  usePrefetchRootCategories({
    enabled: isCurrentPageReady,
    currentHandle: handle,
  })

  usePrefetchPages({
    enabled: isCurrentPageReady,
    currentPage: responsePage,
    hasNextPage,
    hasPrevPage,
    totalPages,
    pageSize: PRODUCT_LIMIT,
    category_id: categoryIds,
    regionId,
    countryCode,
  })

  usePrefetchCategoryChildren({
    enabled: isCurrentPageReady,
    categoryHandle: handle,
  })

  const products = rawProducts.map(transformProduct)

  const handlePageChange = (page: number) => {
    void setPage(page, {
      history: "push",
      scroll: true,
    })
  }

  const rootCategoryTree = categoryTree.find(
    (cat) => cat.id === rootCategory?.id
  )

  const breadcrumbItems: { label: string; href: string; icon?: IconType }[] = [
    { label: "Home", href: "/", icon: "icon-[mdi--home]" },
    { label: rootCategory?.handle || handle, href: `/kategorie/${handle}` },
  ]

  return (
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] p-400">
      <header className="col-span-2 row-span-1">
        <Breadcrumb items={breadcrumbItems} linkAs={NextLink} size="lg" />
      </header>
      <N1Aside
        categories={rootCategoryTree?.children || []}
        categoryMap={categoryMap}
        currentCategory={currentCategory}
        label={rootCategory?.handle}
      />
      <main className="px-300">
        <header className="space-y-300">
          <Heading as="h1">{currentCategory?.handle}</Heading>
          <div className="grid grid-cols-4 gap-100">
            {currentCategoryChildren?.map((child) => (
              <LinkButton
                className="border border-overlay bg-surface py-200 text-fg-primary hover:bg-base"
                href={`/kategorie/${child.handle}`}
                key={child.id}
              >
                {child.name}
              </LinkButton>
            ))}
          </div>
        </header>
        <Banner className="my-300" variant="warning">
          <div className="flex items-center gap-100">
            <span>Zobrazeno</span>
            <span className="font-bold">{totalCount}</span>
            <span>produktů</span>
          </div>
        </Banner>
        <section>
          <ProductGrid
            currentPage={responsePage}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            pageSize={PRODUCT_LIMIT}
            products={products}
            skeletonCount={24}
            totalCount={totalCount}
          />
        </section>
      </main>
    </div>
  )
}
