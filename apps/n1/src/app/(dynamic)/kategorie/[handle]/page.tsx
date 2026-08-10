"use client"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { createPaginationGetPageUrl } from "@techsio/ui-kit/molecules/pagination"
import { BreadcrumbTemplate } from "@techsio/ui-kit/templates/breadcrumb"
import type { BreadcrumbTemplateItem } from "@techsio/ui-kit/templates/breadcrumb"
import NextLink from "next/link"
import { notFound, useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

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
import { useSuspenseProducts } from "@/hooks/use-products"
import { useSuspenseRegion } from "@/hooks/use-region"
import {
  ALL_CATEGORIES_MAP,
  PRODUCT_LIMIT,
  VALID_CATEGORY_ROUTES,
} from "@/lib/constants"
import { useAnalytics } from "@/providers/analytics-provider"
import { transformProduct } from "@/utils/transform/transform-product"

type Category = (typeof allCategories)[number]

const categoryById = new Map(
  allCategories.map((category) => [category.id, category]),
)

const getCategoryPath = (category: Category) => {
  const path: string[] = []
  let current: Category | undefined = category

  while (current !== undefined) {
    path.unshift(current.name)
    const parentCategoryId: string | null | undefined =
      current.parent_category_id
    current =
      typeof parentCategoryId === "string" && parentCategoryId.length > 0
        ? categoryById.get(parentCategoryId)
        : undefined
  }

  return path.join(" > ")
}

const CategoryPage = () => {
  const params = useParams()
  const searchParams = useSearchParams()
  const { handle: handleParam } = params
  if (typeof handleParam !== "string" || handleParam.length === 0) {
    throw new Error("Handle kategorie je povinný")
  }
  const handle = handleParam
  const { regionId, countryCode } = useSuspenseRegion()
  const analytics = useAnalytics()

  // Track which category we've already tracked to prevent duplicates
  const trackedCategoryId = useRef<string | null>(null)

  const currentCategory = allCategories.find((cat) => cat.handle === handle)
  const currentCategoryChildren = allCategories.filter(
    (cat) => cat.parent_category_id === currentCategory?.id,
  )
  const rootCategory =
    allCategories.find((cat) => cat.id === currentCategory?.root_category_id) ??
    currentCategory

  useEffect(() => {
    if (!currentCategory) {
      return
    }
    if (trackedCategoryId.current === currentCategory.id) {
      return
    }

    trackedCategoryId.current = currentCategory.id
    analytics.trackViewCategory({ category: getCategoryPath(currentCategory) })
  }, [currentCategory, analytics])

  // Get current page from URL or default to 1
  const currentPage = Number(searchParams.get("page")) || 1

  const categoryIds = ALL_CATEGORIES_MAP[handle] ?? []

  const {
    products: rawProducts,
    isFetching,
    totalCount,
    currentPage: responsePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = useSuspenseProducts({
    category_id: categoryIds,
    limit: PRODUCT_LIMIT,
    page: currentPage,
  })

  const isCurrentPageReady = !isFetching

  usePrefetchRootCategories({
    currentHandle: handle,
    delay: 200,
    enabled: isCurrentPageReady,
  })

  usePrefetchPages({
    category_id: categoryIds,
    countryCode,
    currentPage: responsePage,
    enabled: isCurrentPageReady,
    hasNextPage,
    hasPrevPage,
    pageSize: PRODUCT_LIMIT,
    ...(typeof regionId === "string" && regionId.length > 0
      ? { regionId }
      : {}),
    totalPages,
  })

  usePrefetchCategoryChildren({
    categoryHandle: handle,
    enabled: isCurrentPageReady,
  })

  const products = rawProducts.map(transformProduct)

  const getPageUrl = createPaginationGetPageUrl({
    pathname: `/kategorie/${handle}`,
    searchParams: searchParams.toString(),
  })

  if (!VALID_CATEGORY_ROUTES.includes(handle)) {
    notFound()
  }

  const rootCategoryTree = categoryTree.find(
    (cat) => cat.id === rootCategory?.id,
  )

  const breadcrumbItems: BreadcrumbTemplateItem[] = [
    { href: "/", icon: "icon-[mdi--home]", label: "Home" },
    { href: `/kategorie/${handle}`, label: rootCategory?.handle ?? handle },
  ]

  return (
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] p-400">
      <header className="col-span-2 row-span-1">
        <BreadcrumbTemplate
          items={breadcrumbItems}
          linkAs={NextLink}
          size="lg"
        />
      </header>
      <N1Aside
        categories={rootCategoryTree?.children ?? []}
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
            getPageUrl={getPageUrl}
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

export default CategoryPage
