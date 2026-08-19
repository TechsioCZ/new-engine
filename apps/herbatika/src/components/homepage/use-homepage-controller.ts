import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useCatalogProducts } from "@/lib/storefront/catalog-products"
import { useCategories } from "@/lib/storefront/categories"
import {
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE } from "@/lib/storefront/homepage-catalog-config"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import {
  PRODUCT_SECTIONS,
  PRODUCTS_PER_COLLECTION_SECTION,
} from "./homepage.data"
import type { HomepageProductSection } from "./homepage.types"
import { useHomepagePrefetch } from "./use-homepage-prefetch"

type UseHomepageControllerProps = {
  categoryPublicSlugsById: PublicEntitySlugMap
  homepageSectionCategorySourceIds: Readonly<Record<string, string>>
  productPublicSlugsById: PublicEntitySlugMap
}

type UseHomepageControllerResult = {
  productsError: string | null
  shouldShowProductSkeleton: boolean
  leadingSections: HomepageProductSection[]
  trailingSections: HomepageProductSection[]
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void
}

export function useHomepageController({
  categoryPublicSlugsById,
  homepageSectionCategorySourceIds,
  productPublicSlugsById,
}: UseHomepageControllerProps): UseHomepageControllerResult {
  const region = useRegionContext()
  const categoriesQuery = useCategories({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
  })

  const prefetchActions = useHomepagePrefetch(region)

  const categoryByHandle = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categoriesQuery.categories) {
    if (category.handle) {
      categoryByHandle.set(category.handle, category)
    }
  }

  const bestsellersCategoryId = categoryByHandle.get(
    HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE
  )?.id

  const bestsellersProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "recommended",
    category_id: bestsellersCategoryId ? [bestsellersCategoryId] : undefined,
    enabled: Boolean(region?.region_id && bestsellersCategoryId),
  })

  const newProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "newest",
    status: ["new"],
    enabled: Boolean(region?.region_id),
  })

  const saleProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "recommended",
    on_sale: true,
    enabled: Boolean(region?.region_id),
  })

  const sectionQueries = [
    bestsellersProductsQuery,
    newProductsQuery,
    saleProductsQuery,
  ]

  const shouldShowProductSkeleton =
    sectionQueries.every((query) => query.products.length === 0) &&
    (!region?.region_id ||
      categoriesQuery.isLoading ||
      sectionQueries.some((query) => query.isLoading))

  const bestsellersSourceCategoryId =
    homepageSectionCategorySourceIds[PRODUCT_SECTIONS[0].id]
  const newProductsSourceCategoryId =
    homepageSectionCategorySourceIds[PRODUCT_SECTIONS[1].id]
  const saleSourceCategoryId =
    homepageSectionCategorySourceIds[PRODUCT_SECTIONS[2].id]

  const preparedProductSections: HomepageProductSection[] = [
    {
      ...PRODUCT_SECTIONS[0],
      productPublicSlugsById,
      publicSlug: bestsellersSourceCategoryId
        ? categoryPublicSlugsById[bestsellersSourceCategoryId]
        : undefined,
      products: bestsellersProductsQuery.products,
      sourceCategoryId: bestsellersSourceCategoryId,
    },
    {
      ...PRODUCT_SECTIONS[1],
      productPublicSlugsById,
      publicSlug: newProductsSourceCategoryId
        ? categoryPublicSlugsById[newProductsSourceCategoryId]
        : undefined,
      products: newProductsQuery.products,
      sourceCategoryId: newProductsSourceCategoryId,
    },
    {
      ...PRODUCT_SECTIONS[2],
      productPublicSlugsById,
      publicSlug: saleSourceCategoryId
        ? categoryPublicSlugsById[saleSourceCategoryId]
        : undefined,
      products: saleProductsQuery.products,
      sourceCategoryId: saleSourceCategoryId,
    },
  ]

  return {
    productsError:
      categoriesQuery.error ??
      bestsellersProductsQuery.error ??
      newProductsQuery.error ??
      saleProductsQuery.error,
    shouldShowProductSkeleton,
    leadingSections: preparedProductSections.slice(0, 2),
    trailingSections: preparedProductSections.slice(2),
    handleProductHoverStart: prefetchActions.handleProductHoverStart,
    handleProductHoverEnd: prefetchActions.handleProductHoverEnd,
  }
}
