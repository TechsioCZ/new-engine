import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { createMedusaCatalogService } from "../src/catalog/medusa-service"
import type { MedusaCatalogListInput } from "../src/catalog/medusa-service"
import type { CatalogFacets } from "../src/catalog/types"
import { createMedusaCategoryService } from "../src/categories/medusa-service"
import { createMedusaCollectionService } from "../src/collections/medusa-service"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import type { CreateMedusaStorefrontPresetConfig } from "../src/medusa/preset"
import { createMedusaStorefrontServerReadPreset } from "../src/medusa/server-read"
import type { ProductListHooks } from "../src/product-lists/hooks"
import { createMedusaProductListService } from "../src/product-lists/medusa-service"
import type { ProductListCartLike } from "../src/product-lists/types"
import type { ProductHooks } from "../src/products/hooks"
import { createMedusaProductService } from "../src/products/medusa-service"
import type { StoreProductWithPricePerUnit } from "../src/products/types"
import { createMedusaProductReviewService } from "../src/reviews/medusa-service"

declare const sdk: Medusa
declare const explicitUndefined: undefined
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

export const unsafeUndefinedCustomProductService =
  // @ts-expect-error custom product output rejects an explicitly undefined transform config
  createMedusaProductService<{ slug: string }>(sdk, explicitUndefined)

export const unsafeUndefinedCustomCatalogService =
  // @ts-expect-error custom catalog product output rejects an explicitly undefined transform config
  createMedusaCatalogService<{ slug: string }>(sdk, explicitUndefined)

export const unsafeUndefinedCustomCategoryService =
  // @ts-expect-error custom category output rejects an explicitly undefined transform config
  createMedusaCategoryService<{ slug: string }>(sdk, explicitUndefined)

export const unsafeUndefinedCustomCollectionService =
  // @ts-expect-error custom collection output rejects an explicitly undefined transform config
  createMedusaCollectionService<{ slug: string }>(sdk, explicitUndefined)

export const defaultUndefinedProductService = createMedusaProductService(
  sdk,
  explicitUndefined,
)
export const defaultUndefinedCatalogService = createMedusaCatalogService(
  sdk,
  explicitUndefined,
)
export const defaultUndefinedCategoryService = createMedusaCategoryService(
  sdk,
  explicitUndefined,
)
export const defaultUndefinedCollectionService = createMedusaCollectionService(
  sdk,
  explicitUndefined,
)

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

export const unsafeCustomCatalogFacetsService =
  // @ts-expect-error custom catalog facets require a transform config
  createMedusaCatalogService<
    HttpTypes.StoreProduct,
    MedusaCatalogListInput,
    ExtendedCatalogFacets
  >(sdk)

export const unsafeUndefinedCustomCatalogFacetsService =
  createMedusaCatalogService<
    HttpTypes.StoreProduct,
    MedusaCatalogListInput,
    ExtendedCatalogFacets
  >(
    sdk,
    // @ts-expect-error custom catalog facets reject an explicitly undefined transform config
    explicitUndefined,
  )

export const transformedCatalogFacetsService = createMedusaCatalogService<
  HttpTypes.StoreProduct,
  MedusaCatalogListInput,
  ExtendedCatalogFacets
>(sdk, {
  transformFacets: (facets) => ({ ...facets, dosage: [] }),
})
type CustomFacetConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  HttpTypes.StoreProduct,
  ExtendedCatalogFacets
>

// @ts-expect-error custom facet shapes must provide catalog.fallbackFacets
export const missingCatalogFallback: CustomFacetConfig = { sdk }

interface CustomOutput {
  slug: string
}

export const defaultServerReadPreset = createMedusaStorefrontServerReadPreset({
  sdk,
})
export const defaultStorefrontPreset: unknown = createMedusaStorefrontPreset({
  sdk,
})

export const serverReadProductWithoutSection =
  // @ts-expect-error custom product output requires products.serviceConfig
  createMedusaStorefrontServerReadPreset<CustomOutput>({ sdk })
export const serverReadProductWithoutServiceConfig =
  createMedusaStorefrontServerReadPreset<CustomOutput>({
    // @ts-expect-error custom product output requires products.serviceConfig
    products: {},
    sdk,
  })
export const serverReadProductWithUndefinedServiceConfig =
  createMedusaStorefrontServerReadPreset<CustomOutput>({
    products: {
      // @ts-expect-error custom product output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const serverReadCategoryWithoutSection =
  createMedusaStorefrontServerReadPreset<HttpTypes.StoreProduct, CustomOutput>(
    // @ts-expect-error custom category output requires categories.serviceConfig
    { sdk },
  )
export const serverReadCategoryWithoutServiceConfig =
  createMedusaStorefrontServerReadPreset<HttpTypes.StoreProduct, CustomOutput>({
    // @ts-expect-error custom category output requires categories.serviceConfig
    categories: {},
    sdk,
  })
export const serverReadCategoryWithUndefinedServiceConfig =
  createMedusaStorefrontServerReadPreset<HttpTypes.StoreProduct, CustomOutput>({
    categories: {
      // @ts-expect-error custom category output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const serverReadCollectionWithoutSection =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >(
    // @ts-expect-error custom collection output requires collections.serviceConfig
    { sdk },
  )
export const serverReadCollectionWithoutServiceConfig =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >({
    // @ts-expect-error custom collection output requires collections.serviceConfig
    collections: {},
    sdk,
  })
export const serverReadCollectionWithUndefinedServiceConfig =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >({
    collections: {
      // @ts-expect-error custom collection output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const serverReadCatalogProductWithoutSection =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >(
    // @ts-expect-error custom catalog product output requires catalog.serviceConfig
    { sdk },
  )
export const serverReadCatalogProductWithoutServiceConfig =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >({
    // @ts-expect-error custom catalog product output requires catalog.serviceConfig
    catalog: {},
    sdk,
  })
export const serverReadCatalogProductWithUndefinedServiceConfig =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >({
    catalog: {
      // @ts-expect-error custom catalog product output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

const extendedCatalogFacets: ExtendedCatalogFacets = {
  brand: [],
  dosage: [],
  form: [],
  ingredient: [],
  price: { max: null, min: null },
  status: [],
}

export const serverReadCatalogFacetsWithoutSection =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    ExtendedCatalogFacets
  >(
    // @ts-expect-error custom catalog facets require catalog.serviceConfig
    { sdk },
  )
export const serverReadCatalogFacetsWithoutServiceConfig =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    ExtendedCatalogFacets
  >({
    // @ts-expect-error custom catalog facets require catalog.serviceConfig
    catalog: {},
    sdk,
  })
export const serverReadCatalogFacetsWithUndefinedServiceConfig =
  createMedusaStorefrontServerReadPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    ExtendedCatalogFacets
  >({
    catalog: {
      // @ts-expect-error custom catalog facets reject an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const transformedServerReadPreset =
  createMedusaStorefrontServerReadPreset<
    CustomOutput,
    CustomOutput,
    CustomOutput,
    CustomOutput,
    ExtendedCatalogFacets
  >({
    catalog: {
      serviceConfig: {
        transformFacets: (facets) => ({ ...facets, dosage: [] }),
        transformProduct: (product) => ({ slug: product.handle }),
      },
    },
    categories: {
      serviceConfig: {
        transformCategory: (category) => ({ slug: category.handle }),
      },
    },
    collections: {
      serviceConfig: {
        transformCollection: (collection) => ({ slug: collection.handle }),
      },
    },
    products: {
      serviceConfig: {
        transformProduct: (product) => ({ slug: product.handle }),
      },
    },
    sdk,
  })

export const storefrontProductWithoutSection: unknown =
  // @ts-expect-error custom product output requires products.serviceConfig
  createMedusaStorefrontPreset<CustomOutput>({ sdk })
export const storefrontProductWithoutServiceConfig: unknown =
  // @ts-expect-error custom product output requires products.serviceConfig
  createMedusaStorefrontPreset<CustomOutput>({ products: {}, sdk })
export const storefrontProductWithUndefinedServiceConfig: unknown =
  createMedusaStorefrontPreset<CustomOutput>({
    products: {
      // @ts-expect-error custom product output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const storefrontCategoryWithoutSection: unknown =
  // @ts-expect-error custom category output requires categories.serviceConfig
  createMedusaStorefrontPreset<HttpTypes.StoreProduct, CustomOutput>({ sdk })
export const storefrontCategoryWithoutServiceConfig: unknown =
  createMedusaStorefrontPreset<HttpTypes.StoreProduct, CustomOutput>({
    // @ts-expect-error custom category output requires categories.serviceConfig
    categories: {},
    sdk,
  })
export const storefrontCategoryWithUndefinedServiceConfig: unknown =
  createMedusaStorefrontPreset<HttpTypes.StoreProduct, CustomOutput>({
    categories: {
      // @ts-expect-error custom category output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const storefrontCollectionWithoutSection: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >(
    // @ts-expect-error custom collection output requires collections.serviceConfig
    { sdk },
  )
export const storefrontCollectionWithoutServiceConfig: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >({
    // @ts-expect-error custom collection output requires collections.serviceConfig
    collections: {},
    sdk,
  })
export const storefrontCollectionWithUndefinedServiceConfig: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >({
    collections: {
      // @ts-expect-error custom collection output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const storefrontCatalogProductWithoutSection: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >(
    // @ts-expect-error custom catalog product output requires catalog.serviceConfig
    { sdk },
  )
export const storefrontCatalogProductWithoutServiceConfig: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >({
    // @ts-expect-error custom catalog product output requires catalog.serviceConfig
    catalog: {},
    sdk,
  })
export const storefrontCatalogProductWithUndefinedServiceConfig: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >({
    catalog: {
      // @ts-expect-error custom catalog product output rejects an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const storefrontCatalogFacetsWithoutServiceConfig: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    ExtendedCatalogFacets
  >({
    // @ts-expect-error custom catalog facets require catalog.serviceConfig
    catalog: { fallbackFacets: extendedCatalogFacets },
    sdk,
  })
export const storefrontCatalogFacetsWithUndefinedServiceConfig: unknown =
  createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    ExtendedCatalogFacets
  >({
    catalog: {
      fallbackFacets: extendedCatalogFacets,
      // @ts-expect-error custom catalog facets reject an undefined serviceConfig
      serviceConfig: explicitUndefined,
    },
    sdk,
  })

export const transformedStorefrontPreset: unknown =
  createMedusaStorefrontPreset<
    CustomOutput,
    CustomOutput,
    CustomOutput,
    CustomOutput,
    ExtendedCatalogFacets
  >({
    catalog: {
      fallbackFacets: extendedCatalogFacets,
      serviceConfig: {
        transformFacets: (facets) => ({ ...facets, dosage: [] }),
        transformProduct: (product) => ({ slug: product.handle }),
      },
    },
    categories: {
      serviceConfig: {
        transformCategory: (category) => ({ slug: category.handle }),
      },
    },
    collections: {
      serviceConfig: {
        transformCollection: (collection) => ({ slug: collection.handle }),
      },
    },
    products: {
      serviceConfig: {
        transformProduct: (product) => ({ slug: product.handle }),
      },
    },
    sdk,
  })

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
