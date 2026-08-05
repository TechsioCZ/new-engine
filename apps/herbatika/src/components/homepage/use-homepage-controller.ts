import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"

import { useCatalogProducts } from "@/lib/storefront/catalog-products"
import { useCategories } from "@/lib/storefront/categories"
import {
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE } from "@/lib/storefront/homepage-catalog-config"

import {
  PRODUCT_SECTIONS,
  PRODUCTS_PER_COLLECTION_SECTION,
} from "./homepage.data"
import type { HomepageProductSection } from "./homepage.types"
import { useHomepagePrefetch } from "./use-homepage-prefetch"

interface UseHomepageControllerResult {
  productsError: string | null
  shouldShowProductSkeleton: boolean
  leadingSections: HomepageProductSection[]
  trailingSections: HomepageProductSection[]
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void
}

export function useHomepageController(): UseHomepageControllerResult {
  const region = useRegionContext()
  const categoriesQuery = useCategories({
    fields: CATEGORY_TREE_FIELDS,
    limit: CATEGORY_TREE_LIMIT,
    page: 1,
  })

  const prefetchActions = useHomepagePrefetch(region)

  const categoryByHandle = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categoriesQuery.categories) {
    if (category.handle) {
      categoryByHandle.set(category.handle, category)
    }
  }

  const bestsellersCategoryId = categoryByHandle.get(
    HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
  )?.id

  const bestsellersProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "recommended",
    ...(bestsellersCategoryId ? { category_id: [bestsellersCategoryId] } : {}),
    enabled: Boolean(region?.region_id && bestsellersCategoryId),
  })

  const newProductsQuery = useCatalogProducts({
    enabled: Boolean(region?.region_id),
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    page: 1,
    sort: "newest",
    status: ["new"],
  })

  const actionProductsQuery = useCatalogProducts({
    enabled: Boolean(region?.region_id),
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    page: 1,
    sort: "recommended",
    status: ["action"],
  })

  const sectionQueries = [
    bestsellersProductsQuery,
    newProductsQuery,
    actionProductsQuery,
  ]

  const shouldShowProductSkeleton =
    sectionQueries.every((query) => query.products.length === 0) &&
    (!region?.region_id ||
      categoriesQuery.isLoading ||
      sectionQueries.some((query) => query.isLoading))

  const preparedProductSections: HomepageProductSection[] = [
    {
      ...PRODUCT_SECTIONS[0],
      products: bestsellersProductsQuery.products,
    },
    {
      ...PRODUCT_SECTIONS[1],
      products: newProductsQuery.products,
    },
    {
      ...PRODUCT_SECTIONS[2],
      products: actionProductsQuery.products,
    },
  ]

  return {
    handleProductHoverEnd: prefetchActions.handleProductHoverEnd,
    handleProductHoverStart: prefetchActions.handleProductHoverStart,
    leadingSections: preparedProductSections.slice(0, 2),
    productsError:
      categoriesQuery.error ??
      bestsellersProductsQuery.error ??
      newProductsQuery.error ??
      actionProductsQuery.error,
    shouldShowProductSkeleton,
    trailingSections: preparedProductSections.slice(2),
  }
}
