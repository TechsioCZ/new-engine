import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { createMedusaCatalogService } from "../src/catalog/medusa-service"
import type {
  MedusaCatalogListInput,
  MedusaCatalogProduct,
} from "../src/catalog/medusa-service"
import type { CatalogFacets } from "../src/catalog/types"
import { createMedusaCategoryService } from "../src/categories/medusa-service"
import { createMedusaCollectionService } from "../src/collections/medusa-service"
import type { MedusaShippingMethodData } from "../src/medusa/checkout-flow"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import type { CreateMedusaStorefrontPresetConfig } from "../src/medusa/preset"
import { createMedusaStorefrontServerReadPreset } from "../src/medusa/server-read"
import type { CreateMedusaStorefrontServerReadPresetConfig } from "../src/medusa/server-read"
import type { ProductListHooks } from "../src/product-lists/hooks"
import { createMedusaProductListService } from "../src/product-lists/medusa-service"
import type { ProductListCartLike } from "../src/product-lists/types"
import type { ProductHooks } from "../src/products/hooks"
import { createMedusaProductService } from "../src/products/medusa-service"
import type { StoreProductWithPricePerUnit } from "../src/products/types"
import { createMedusaProductReviewService } from "../src/reviews/medusa-service"
import type { ExpectFalse, Extends } from "./type-assertions"

declare const sdk: Medusa
declare const explicitUndefined: undefined
declare const productWithPricePerUnit: StoreProductWithPricePerUnit

interface PickupShippingData {
  pickupPointId: string
}

const pickupShippingData: MedusaShippingMethodData<PickupShippingData> = {
  pickupPointId: "pickup_1",
}
export const typedPickupPointId: string = pickupShippingData.pickupPointId

const pricePerUnit =
  productWithPricePerUnit.variants?.[0]?.calculated_price?.price_per_unit

export const validPricePerUnitAmount: number | undefined =
  pricePerUnit?.calculated_amount_with_tax
export const validPricePerUnitSymbol: string | undefined =
  pricePerUnit?.unit_symbol
export type PricePerUnitRejectsUnreturnedAmount = ExpectFalse<
  Extends<"amount", keyof NonNullable<typeof pricePerUnit>>
>

export const defaultProductService = createMedusaProductService(sdk)
export const defaultCatalogService = createMedusaCatalogService(sdk)
export const defaultCategoryService = createMedusaCategoryService(sdk)
export const defaultCollectionService = createMedusaCollectionService(sdk)
export const defaultReviewService = createMedusaProductReviewService(sdk)
export const defaultProductListService = createMedusaProductListService(sdk)

interface CustomOutput {
  slug: string
}

type CustomProductServiceParameters = Parameters<
  typeof createMedusaProductService<CustomOutput>
>
type CustomCatalogServiceParameters = Parameters<
  typeof createMedusaCatalogService<CustomOutput>
>
type CustomCategoryServiceParameters = Parameters<
  typeof createMedusaCategoryService<CustomOutput>
>
type CustomCollectionServiceParameters = Parameters<
  typeof createMedusaCollectionService<CustomOutput>
>
type CustomReviewServiceParameters = Parameters<
  typeof createMedusaProductReviewService<CustomOutput>
>
type CustomProductListServiceParameters = Parameters<
  typeof createMedusaProductListService<CustomOutput>
>

export type CustomProductServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomProductServiceParameters>
>
export type CustomCatalogServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomCatalogServiceParameters>
>
export type CustomCategoryServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomCategoryServiceParameters>
>
export type CustomCollectionServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomCollectionServiceParameters>
>
export type CustomReviewServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomReviewServiceParameters>
>
export type CustomProductListServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomProductListServiceParameters>
>
export type CustomProductServiceRejectsUndefinedTransform = ExpectFalse<
  Extends<[sdk: Medusa, config: undefined], CustomProductServiceParameters>
>
export type CustomCatalogServiceRejectsUndefinedTransform = ExpectFalse<
  Extends<[sdk: Medusa, config: undefined], CustomCatalogServiceParameters>
>
export type CustomCategoryServiceRejectsUndefinedTransform = ExpectFalse<
  Extends<[sdk: Medusa, config: undefined], CustomCategoryServiceParameters>
>
export type CustomCollectionServiceRejectsUndefinedTransform = ExpectFalse<
  Extends<[sdk: Medusa, config: undefined], CustomCollectionServiceParameters>
>

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

type CustomCatalogFacetsServiceParameters = Parameters<
  typeof createMedusaCatalogService<
    MedusaCatalogProduct,
    MedusaCatalogListInput,
    ExtendedCatalogFacets
  >
>

export type CustomCatalogFacetsServiceRequiresTransform = ExpectFalse<
  Extends<[sdk: Medusa], CustomCatalogFacetsServiceParameters>
>
export type CustomCatalogFacetsServiceRejectsUndefinedTransform = ExpectFalse<
  Extends<
    [sdk: Medusa, config: undefined],
    CustomCatalogFacetsServiceParameters
  >
>

export const transformedCatalogFacetsService = createMedusaCatalogService<
  MedusaCatalogProduct,
  MedusaCatalogListInput,
  ExtendedCatalogFacets
>(sdk, {
  transformFacets: (facets) => ({ ...facets, dosage: [] }),
})
type CustomFacetConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  MedusaCatalogProduct,
  ExtendedCatalogFacets
>

export type CustomFacetConfigRequiresCatalogFallback = ExpectFalse<
  Extends<
    {
      catalog: {
        serviceConfig: {
          transformFacets: (facets: CatalogFacets) => ExtendedCatalogFacets
        }
      }
      sdk: Medusa
    },
    CustomFacetConfig
  >
>

export const defaultServerReadPreset = createMedusaStorefrontServerReadPreset({
  sdk,
})
export const defaultStorefrontPreset: unknown = createMedusaStorefrontPreset({
  sdk,
})

type CustomProductServerReadConfig =
  CreateMedusaStorefrontServerReadPresetConfig<CustomOutput>
type CustomCategoryServerReadConfig =
  CreateMedusaStorefrontServerReadPresetConfig<
    HttpTypes.StoreProduct,
    CustomOutput
  >
type CustomCollectionServerReadConfig =
  CreateMedusaStorefrontServerReadPresetConfig<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    CustomOutput
  >
type CustomCatalogProductServerReadConfig =
  CreateMedusaStorefrontServerReadPresetConfig<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    CustomOutput
  >

export type ServerReadCustomProductRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomProductServerReadConfig>
>
export type ServerReadCustomProductRequiresServiceConfig = ExpectFalse<
  Extends<
    { products: Record<never, never>; sdk: Medusa },
    CustomProductServerReadConfig
  >
>
export type ServerReadCustomProductRejectsUndefinedServiceConfig = ExpectFalse<
  Extends<
    { products: { serviceConfig: undefined }; sdk: Medusa },
    CustomProductServerReadConfig
  >
>
export type ServerReadCustomCategoryRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCategoryServerReadConfig>
>
export type ServerReadCustomCategoryRequiresServiceConfig = ExpectFalse<
  Extends<
    { categories: Record<never, never>; sdk: Medusa },
    CustomCategoryServerReadConfig
  >
>
export type ServerReadCustomCategoryRejectsUndefinedServiceConfig = ExpectFalse<
  Extends<
    { categories: { serviceConfig: undefined }; sdk: Medusa },
    CustomCategoryServerReadConfig
  >
>
export type ServerReadCustomCollectionRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCollectionServerReadConfig>
>
export type ServerReadCustomCollectionRequiresServiceConfig = ExpectFalse<
  Extends<
    { collections: Record<never, never>; sdk: Medusa },
    CustomCollectionServerReadConfig
  >
>
export type ServerReadCustomCollectionRejectsUndefinedServiceConfig =
  ExpectFalse<
    Extends<
      { collections: { serviceConfig: undefined }; sdk: Medusa },
      CustomCollectionServerReadConfig
    >
  >
export type ServerReadCustomCatalogProductRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCatalogProductServerReadConfig>
>
export type ServerReadCustomCatalogProductRequiresServiceConfig = ExpectFalse<
  Extends<
    { catalog: Record<never, never>; sdk: Medusa },
    CustomCatalogProductServerReadConfig
  >
>
export type ServerReadCustomCatalogProductRejectsUndefinedServiceConfig =
  ExpectFalse<
    Extends<
      { catalog: { serviceConfig: undefined }; sdk: Medusa },
      CustomCatalogProductServerReadConfig
    >
  >

const extendedCatalogFacets: ExtendedCatalogFacets = {
  brand: [],
  dosage: [],
  form: [],
  ingredient: [],
  price: { max: null, min: null },
  status: [],
}

type CustomCatalogFacetsServerReadConfig =
  CreateMedusaStorefrontServerReadPresetConfig<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    MedusaCatalogProduct,
    ExtendedCatalogFacets
  >

export type ServerReadCustomCatalogFacetsRequireSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCatalogFacetsServerReadConfig>
>
export type ServerReadCustomCatalogFacetsRequireServiceConfig = ExpectFalse<
  Extends<
    { catalog: Record<never, never>; sdk: Medusa },
    CustomCatalogFacetsServerReadConfig
  >
>
export type ServerReadCustomCatalogFacetsRejectUndefinedServiceConfig =
  ExpectFalse<
    Extends<
      { catalog: { serviceConfig: undefined }; sdk: Medusa },
      CustomCatalogFacetsServerReadConfig
    >
  >

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

type CustomProductStorefrontConfig =
  CreateMedusaStorefrontPresetConfig<CustomOutput>
type CustomCategoryStorefrontConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  CustomOutput
>
type CustomCollectionStorefrontConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  CustomOutput
>
type CustomCatalogProductStorefrontConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  CustomOutput
>

export type StorefrontCustomProductRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomProductStorefrontConfig>
>
export type StorefrontCustomProductRequiresServiceConfig = ExpectFalse<
  Extends<
    { products: Record<never, never>; sdk: Medusa },
    CustomProductStorefrontConfig
  >
>
export type StorefrontCustomProductRejectsUndefinedServiceConfig = ExpectFalse<
  Extends<
    { products: { serviceConfig: undefined }; sdk: Medusa },
    CustomProductStorefrontConfig
  >
>
export type StorefrontCustomCategoryRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCategoryStorefrontConfig>
>
export type StorefrontCustomCategoryRequiresServiceConfig = ExpectFalse<
  Extends<
    { categories: Record<never, never>; sdk: Medusa },
    CustomCategoryStorefrontConfig
  >
>
export type StorefrontCustomCategoryRejectsUndefinedServiceConfig = ExpectFalse<
  Extends<
    { categories: { serviceConfig: undefined }; sdk: Medusa },
    CustomCategoryStorefrontConfig
  >
>
export type StorefrontCustomCollectionRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCollectionStorefrontConfig>
>
export type StorefrontCustomCollectionRequiresServiceConfig = ExpectFalse<
  Extends<
    { collections: Record<never, never>; sdk: Medusa },
    CustomCollectionStorefrontConfig
  >
>
export type StorefrontCustomCollectionRejectsUndefinedServiceConfig =
  ExpectFalse<
    Extends<
      { collections: { serviceConfig: undefined }; sdk: Medusa },
      CustomCollectionStorefrontConfig
    >
  >
export type StorefrontCustomCatalogProductRequiresSection = ExpectFalse<
  Extends<{ sdk: Medusa }, CustomCatalogProductStorefrontConfig>
>
export type StorefrontCustomCatalogProductRequiresServiceConfig = ExpectFalse<
  Extends<
    { catalog: Record<never, never>; sdk: Medusa },
    CustomCatalogProductStorefrontConfig
  >
>
export type StorefrontCustomCatalogProductRejectsUndefinedServiceConfig =
  ExpectFalse<
    Extends<
      { catalog: { serviceConfig: undefined }; sdk: Medusa },
      CustomCatalogProductStorefrontConfig
    >
  >
export type StorefrontCustomCatalogFacetsRequireServiceConfig = ExpectFalse<
  Extends<
    {
      catalog: { fallbackFacets: ExtendedCatalogFacets }
      sdk: Medusa
    },
    CustomFacetConfig
  >
>
export type StorefrontCustomCatalogFacetsRejectUndefinedServiceConfig =
  ExpectFalse<
    Extends<
      {
        catalog: {
          fallbackFacets: ExtendedCatalogFacets
          serviceConfig: undefined
        }
        sdk: Medusa
      },
      CustomFacetConfig
    >
  >

const transformedStorefrontPreset = createMedusaStorefrontPreset<
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

declare const transformedCatalogHookResult: ReturnType<
  typeof transformedStorefrontPreset.hooks.catalog.useCatalogProducts
>
export const transformedStorefrontDosage =
  transformedCatalogHookResult.facets.dosage

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

export type SuspenseProductListDetailRequiresId = ExpectFalse<
  Extends<{ customerId: string }, SuspenseProductListInput>
>

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

export type SuspenseProductListRejectsEnabled = ExpectFalse<
  Extends<"enabled", keyof SuspenseProductListQueryInput>
>
export type SuspenseProductDetailRejectsEnabled = ExpectFalse<
  Extends<"enabled", keyof SuspenseProductDetailInput>
>
