import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { createMedusaCatalogService } from "../src/catalog/medusa-service"
import type { CatalogFacets } from "../src/catalog/types"
import { createMedusaCategoryService } from "../src/categories/medusa-service"
import { createMedusaCollectionService } from "../src/collections/medusa-service"
import type { CreateMedusaStorefrontPresetConfig } from "../src/medusa/preset"
import type { ProductListHooks } from "../src/product-lists/hooks"
import { createMedusaProductListService } from "../src/product-lists/medusa-service"
import type { ProductListCartLike } from "../src/product-lists/types"
import type { ProductHooks } from "../src/products/hooks"
import { createMedusaProductService } from "../src/products/medusa-service"
import type { StoreProductWithPricePerUnit } from "../src/products/types"
import { createMedusaProductReviewService } from "../src/reviews/medusa-service"

declare const sdk: Medusa
declare const productWithPricePerUnit: StoreProductWithPricePerUnit

const pricePerUnit =
  productWithPricePerUnit.variants?.[0]?.calculated_price?.price_per_unit

export const validPricePerUnitAmount: number | undefined =
  pricePerUnit?.calculated_amount_with_tax
export const validPricePerUnitSymbol: string | undefined =
  pricePerUnit?.unit_symbol
// @ts-expect-error the shared contract must reject fields not returned by the API
export const invalidPricePerUnitField: unknown = pricePerUnit?.amount

export const defaultProductService = createMedusaProductService(sdk)
export const defaultCatalogService = createMedusaCatalogService(sdk)
export const defaultCategoryService = createMedusaCategoryService(sdk)
export const defaultCollectionService = createMedusaCollectionService(sdk)
export const defaultReviewService = createMedusaProductReviewService(sdk)
export const defaultProductListService = createMedusaProductListService(sdk)

export const unsafeCustomProductService =
  // @ts-expect-error custom product output requires a transform
  createMedusaProductService<{ slug: string }>(sdk)

export const unsafeCustomCatalogService =
  // @ts-expect-error custom catalog output requires a transform
  createMedusaCatalogService<{ slug: string }>(sdk)

export const unsafeCustomCategoryService =
  // @ts-expect-error custom category output requires a transform
  createMedusaCategoryService<{ slug: string }>(sdk)

export const unsafeCustomCollectionService =
  // @ts-expect-error custom collection output requires a transform
  createMedusaCollectionService<{ slug: string }>(sdk)

export const unsafeCustomReviewService =
  // @ts-expect-error custom review output requires a transform
  createMedusaProductReviewService<{ slug: string }>(sdk)

export const unsafeCustomProductListService =
  // @ts-expect-error custom product-list output requires a transform
  createMedusaProductListService<{ slug: string }>(sdk)

export const customProductService = createMedusaProductService<{
  slug: string
}>(sdk, {
  transformProduct: (product) => ({ slug: product.handle }),
})
export const customCatalogService = createMedusaCatalogService<{
  slug: string
}>(sdk, {
  transformProduct: (product) => ({ slug: product.handle }),
})
export const customCategoryService = createMedusaCategoryService<{
  slug: string
}>(sdk, {
  transformCategory: (category) => ({ slug: category.handle }),
})
export const customCollectionService = createMedusaCollectionService<{
  slug: string
}>(sdk, {
  transformCollection: (collection) => ({ slug: collection.handle }),
})
export const customReviewService = createMedusaProductReviewService<{
  slug: string
}>(sdk, {
  transformReview: (review) => ({ slug: review.id }),
})
export const customProductListService = createMedusaProductListService<{
  slug: string
}>(sdk, {
  transformProductList: (productList) => ({ slug: productList.id }),
})

type ExtendedCatalogFacets = CatalogFacets & {
  dosage: CatalogFacets["brand"]
}
type CustomFacetConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  HttpTypes.StoreProduct,
  ExtendedCatalogFacets
>

// @ts-expect-error custom facet shapes must provide catalog.fallbackFacets
export const missingCatalogFallback: CustomFacetConfig = { sdk }

interface ProductList {
  id: string
}
interface ProductListItem {
  id: string
}
type Cart = ProductListCartLike
interface ProductListsInput {
  page?: number
  limit?: number
  customerId?: string | null
  enabled?: boolean
}
interface ProductListInput {
  id?: string | null
  customerId?: string | null
  enabled?: boolean
}
type ProductListHookSet = ProductListHooks<
  ProductList,
  ProductListItem,
  Cart,
  ProductListsInput,
  ProductListInput
>
type SuspenseProductListInput = Parameters<
  ProductListHookSet["useSuspenseProductList"]
>[0]

export const validSuspenseProductListDetailInput: SuspenseProductListInput = {
  customerId: "cus_1",
  id: "list_1",
}

// @ts-expect-error suspense product-list detail input requires id
export const missingSuspenseProductListDetailInput: SuspenseProductListInput = {
  customerId: "cus_1",
}

interface Product {
  id: string
}
interface ProductListQueryInput {
  page?: number
  limit?: number
  region_id?: string
  enabled?: boolean
}
interface ProductDetailInput {
  handle: string
  region_id?: string
  enabled?: boolean
}
type ProductHookSet = ProductHooks<
  Product,
  ProductListQueryInput,
  ProductDetailInput
>
type SuspenseProductListQueryInput = Parameters<
  ProductHookSet["useSuspenseProducts"]
>[0]
type SuspenseProductDetailInput = Parameters<
  ProductHookSet["useSuspenseProduct"]
>[0]

export const validSuspenseProductListInput: SuspenseProductListQueryInput = {
  limit: 10,
  page: 1,
  region_id: "reg_1",
}
export const validSuspenseProductDetailInput: SuspenseProductDetailInput = {
  handle: "hoodie",
  region_id: "reg_1",
}

export const invalidSuspenseProductListInput = {
  // @ts-expect-error suspense product list input must not expose enabled
  enabled: false,
  page: 1,
} satisfies SuspenseProductListQueryInput

export const invalidSuspenseProductDetailInput = {
  // @ts-expect-error suspense product detail input must not expose enabled
  enabled: false,
  handle: "hoodie",
} satisfies SuspenseProductDetailInput
