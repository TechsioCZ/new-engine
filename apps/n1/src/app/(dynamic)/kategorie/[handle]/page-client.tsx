"use client"

import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import {
  Breadcrumb,
  type BreadcrumbItemType,
} from "@techsio/ui-kit/molecules/breadcrumb"
import NextLink from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
import { storefront } from "@/hooks/storefront-preset"
import { usePrefetchCategoryChildren } from "@/hooks/use-prefetch-category-children"
import { usePrefetchPages } from "@/hooks/use-prefetch-pages"
import { usePrefetchRootCategories } from "@/hooks/use-prefetch-root-categories"
import { ALL_CATEGORIES_MAP, PRODUCT_LIMIT } from "@/lib/constants"
import { resolveProductPagination } from "@/lib/product-query-params"
import { useAnalytics } from "@/providers/analytics-provider"
import { buildBreadcrumbs } from "@/utils/helpers/build-breadcrumb"
import { transformProduct } from "@/utils/transform/transform-product"

type CategoryPageClientProps = {
  handle: string
  currentPage: number
  rootCategoryHandle: string
  rootCategoryId: string
}

export function CategoryPageClient({
  handle,
  currentPage,
  rootCategoryHandle,
  rootCategoryId,
}: CategoryPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const analytics = useAnalytics()

  const trackedCategoryId = useRef<string | null>(null)

  const currentCategory = allCategories.find((category) => category.handle === handle)
  const currentCategoryChildren = allCategories.filter(
    (category) => category.parent_category_id === currentCategory?.id
  )
  const rootCategoryTree = categoryTree.find(
    (category) => category.id === rootCategoryId
  )

  useEffect(() => {
    if (!currentCategory) {
      return
    }
    if (trackedCategoryId.current === currentCategory.id) {
      return
    }

    const path: string[] = []
    let current: typeof currentCategory | undefined = currentCategory

    while (current) {
      path.unshift(current.name)
      current = allCategories.find(
        (category) => category.id === current?.parent_category_id
      )
    }

    if (path.length > 0) {
      trackedCategoryId.current = currentCategory.id
      analytics.trackViewCategory({ category: path.join(" > ") })
    }
  }, [currentCategory, analytics])

  const handlePageChange = (page: number) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set("page", page.toString())
    router.push(`/kategorie/${handle}?${nextSearchParams.toString()}`, {
      scroll: true,
    })
  }

  if (!currentCategory) {
    return null
  }

  const breadcrumbItems: BreadcrumbItemType[] = buildBreadcrumbs(
    currentCategory.id,
    categoryMap
  ).map((item, index) =>
    index === 0 ? { ...item, icon: "icon-[mdi--home]" } : item
  )

  const categoryIds = ALL_CATEGORIES_MAP[handle] ?? []
  const { limit, offset } = resolveProductPagination({
    page: currentPage,
    limit: PRODUCT_LIMIT,
  })
  const {
    products: rawProducts,
    isFetching,
    totalCount,
    currentPage: responsePage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = storefront.hooks.products.useSuspenseProducts({
    category_id: categoryIds,
    limit,
    offset,
  })

  const isCurrentPageReady = !isFetching

  usePrefetchRootCategories({
    enabled: isCurrentPageReady,
    currentHandle: handle,
    delay: 200,
  })

  usePrefetchPages({
    enabled: isCurrentPageReady,
    currentPage: responsePage,
    hasNextPage,
    hasPrevPage,
    totalPages,
    pageSize: PRODUCT_LIMIT,
    category_id: categoryIds,
  })

  usePrefetchCategoryChildren({
    enabled: isCurrentPageReady,
    categoryHandle: handle,
  })

  const products = rawProducts.map(transformProduct)

  return (
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] p-400">
      <header className="col-span-2 row-span-1">
        <Breadcrumb items={breadcrumbItems} linkAs={NextLink} size="lg" />
      </header>
      <N1Aside
        categories={rootCategoryTree?.children || []}
        categoryMap={categoryMap}
        currentCategory={currentCategory}
        label={rootCategoryHandle}
      />
      <main className="px-300">
        <header className="space-y-300">
          <Heading as="h1">{currentCategory.handle}</Heading>
          <div className="grid grid-cols-4 gap-100">
            {currentCategoryChildren.map((child) => (
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
