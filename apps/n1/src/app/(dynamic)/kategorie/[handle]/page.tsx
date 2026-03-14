"use client"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import {
  Breadcrumb,
  type BreadcrumbItemType,
} from "@techsio/ui-kit/molecules/breadcrumb"
import NextLink from "next/link"
import {
  notFound,
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation"
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
import { useSuspenseProducts } from "@/hooks/use-products"
import {
  ALL_CATEGORIES_MAP,
  PRODUCT_LIMIT,
  VALID_CATEGORY_ROUTES,
} from "@/lib/constants"
import { useAnalytics } from "@/providers/analytics-provider"
import { buildBreadcrumbs } from "@/utils/helpers/build-breadcrumb"
import { transformProduct } from "@/utils/transform/transform-product"

type StaticCategory = (typeof allCategories)[number]

const parsePageParam = (value: string | null): number => {
  if (value == null) {
    return 1
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }

  return Math.max(1, Math.floor(parsed))
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const handle = params.handle as string
  const analytics = useAnalytics()

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

  const handlePageChange = (page: number) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set("page", page.toString())
    router.push(`/kategorie/${handle}?${newSearchParams.toString()}`, {
      scroll: true,
    })
  }

  if (
    !(VALID_CATEGORY_ROUTES.includes(handle) && currentCategory && rootCategory)
  ) {
    notFound()
  }

  const rootCategoryTree = categoryTree.find(
    (cat) => cat.id === rootCategory?.id
  )

  const breadcrumbItems: BreadcrumbItemType[] = buildBreadcrumbs(
    currentCategory?.id,
    categoryMap
  ).map((item, index) =>
    index === 0 ? { ...item, icon: "icon-[mdi--home]" } : item
  )

  const currentPage = parsePageParam(searchParams.get("page"))
  const categoryIds = ALL_CATEGORIES_MAP[handle] ?? []

  return (
    <CategoryPageContent
      breadcrumbItems={breadcrumbItems}
      categoryIds={categoryIds}
      currentCategory={currentCategory}
      currentCategoryChildren={currentCategoryChildren}
      currentPage={currentPage}
      handle={handle}
      onPageChange={handlePageChange}
      rootCategory={rootCategory}
      rootCategoryTree={rootCategoryTree}
    />
  )
}

type CategoryPageContentProps = {
  breadcrumbItems: BreadcrumbItemType[]
  categoryIds: string[]
  currentCategory: StaticCategory
  currentCategoryChildren: StaticCategory[]
  currentPage: number
  handle: string
  onPageChange: (page: number) => void
  rootCategory: StaticCategory
  rootCategoryTree?: (typeof categoryTree)[number]
}

function CategoryPageContent({
  breadcrumbItems,
  categoryIds,
  currentCategory,
  currentCategoryChildren,
  currentPage,
  handle,
  onPageChange,
  rootCategory,
  rootCategoryTree,
}: CategoryPageContentProps) {
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
    page: currentPage,
    limit: PRODUCT_LIMIT,
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
            onPageChange={onPageChange}
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
