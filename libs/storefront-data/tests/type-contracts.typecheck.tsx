import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { CatalogFacets } from "../src/catalog/types"
import type { CreateMedusaStorefrontPresetConfig } from "../src/medusa/preset"
import type { ProductListHooks } from "../src/product-lists/hooks"
import type { ProductListCartLike } from "../src/product-lists/types"
import type { ProductHooks } from "../src/products/hooks"
import type { StoreProductWithPricePerUnit } from "../src/products/types"

declare const sdk: Medusa
declare const productWithPricePerUnit: StoreProductWithPricePerUnit

const pricePerUnit =
  productWithPricePerUnit.variants?.[0]?.calculated_price?.price_per_unit

export const validPricePerUnitAmount: number | undefined =
  pricePerUnit?.calculated_amount_with_tax
export const validPricePerUnitSymbol: string | undefined =
  pricePerUnit?.unit_symbol
// @ts-expect-error the shared contract must reject fields not returned by the API
export const invalidPricePerUnitField = pricePerUnit?.amount

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

type ProductList = { id: string }
type ProductListItem = { id: string }
type Cart = ProductListCartLike
type ProductListsInput = {
  page?: number
  limit?: number
  customerId?: string | null
  enabled?: boolean
}
type ProductListInput = {
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
  id: "list_1",
  customerId: "cus_1",
}

// @ts-expect-error suspense product-list detail input requires id
export const missingSuspenseProductListDetailInput: SuspenseProductListInput = {
  customerId: "cus_1",
}

type Product = { id: string }
type ProductListQueryInput = {
  page?: number
  limit?: number
  region_id?: string
  enabled?: boolean
}
type ProductDetailInput = {
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
  page: 1,
  limit: 10,
  region_id: "reg_1",
}
export const validSuspenseProductDetailInput: SuspenseProductDetailInput = {
  handle: "hoodie",
  region_id: "reg_1",
}

export const invalidSuspenseProductListInput = {
  page: 1,
  // @ts-expect-error suspense product list input must not expose enabled
  enabled: false,
} satisfies SuspenseProductListQueryInput

export const invalidSuspenseProductDetailInput = {
  handle: "hoodie",
  // @ts-expect-error suspense product detail input must not expose enabled
  enabled: false,
} satisfies SuspenseProductDetailInput
