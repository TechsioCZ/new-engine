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
import { useSuspenseCategoryRegistry } from "@/hooks/use-category-registry"
import { usePrefetchCategoryChildren } from "@/hooks/use-prefetch-category-children"
import { usePrefetchPages } from "@/hooks/use-prefetch-pages"
import { usePrefetchRootCategories } from "@/hooks/use-prefetch-root-categories"
import { useSuspenseProducts } from "@/hooks/use-products"
import {
  buildCategoryPath as buildCategoryPathLabel,
  getCategoryByHandle,
  getCategoryChildren,
  getCategoryDescendantIds,
  getRootCategory,
  getRootCategoryTree,
} from "@/lib/categories/selectors"
import type { Category, CategoryTreeNode } from "@/lib/categories/types"
import { PRODUCT_LIMIT } from "@/lib/constants"
import { useAnalytics } from "@/providers/analytics-provider"
import { transformProduct } from "@/utils/transform/transform-product"

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
  const categoryRegistry = useSuspenseCategoryRegistry()

  const trackedCategoryId = useRef<string | null>(null)

  const currentCategory = getCategoryByHandle(categoryRegistry, handle)
  const currentCategoryChildren = getCategoryChildren(
    categoryRegistry,
    currentCategory?.id
  )
  const rootCategory = getRootCategory(categoryRegistry, currentCategory)
  const currentCategoryIds = getCategoryDescendantIds(
    categoryRegistry,
    currentCategory?.id
  )

  const resolveCategoryPath = useCallback(
    (): string | null =>
      buildCategoryPathLabel(categoryRegistry, currentCategory),
    [categoryRegistry, currentCategory]
  )

  useEffect(() => {
    if (!currentCategory) {
      return
    }
    if (trackedCategoryId.current === currentCategory.id) {
      return
    }

    const categoryPath = resolveCategoryPath()
    if (categoryPath) {
      trackedCategoryId.current = currentCategory.id
      analytics.trackViewCategory({ category: categoryPath })
    }
  }, [currentCategory, analytics, resolveCategoryPath])

  const handlePageChange = (page: number) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.set("page", page.toString())
    router.push(`/kategorie/${handle}?${newSearchParams.toString()}`, {
      scroll: true,
    })
  }

  if (!(currentCategory && rootCategory)) {
    notFound()
  }

  const rootCategoryTree = getRootCategoryTree(categoryRegistry, rootCategory)
  const breadcrumbItems: BreadcrumbItemType[] = [
    { label: "Home", href: "/", icon: "icon-[mdi--home]" },
    {
      label: rootCategory.name,
      href: `/kategorie/${rootCategory.handle}`,
    },
  ]
  const currentPage = parsePageParam(searchParams.get("page"))

  return (
    <CategoryPageContent
      breadcrumbItems={breadcrumbItems}
      categoryMap={categoryRegistry.categoryMapById}
      currentCategory={currentCategory}
      currentCategoryChildren={currentCategoryChildren}
      currentCategoryIds={currentCategoryIds}
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
  categoryMap: Record<string, Category>
  currentCategoryIds: string[]
  currentCategory: Category
  currentCategoryChildren: Category[]
  currentPage: number
  handle: string
  onPageChange: (page: number) => void
  rootCategory: Category
  rootCategoryTree?: CategoryTreeNode
}

function CategoryPageContent({
  breadcrumbItems,
  categoryMap,
  currentCategoryIds,
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
    category_id: currentCategoryIds,
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
    category_id: currentCategoryIds,
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
        label={rootCategory.name}
      />
      <main className="px-300">
        <header className="space-y-300">
          <Heading as="h1">{currentCategory.name}</Heading>
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
