import type { HttpTypes } from "@medusajs/types"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import type { MedusaCustomerProfileUpdateInput } from "@techsio/storefront-data/customers/medusa-service"
import {
  type CreateMedusaStorefrontPresetConfig,
  createMedusaStorefrontPreset,
  createMedusaStorefrontQueryKeys,
} from "@techsio/storefront-data/medusa/preset"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { isNotFoundError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import { buildProductQueryParams } from "@/lib/product-query-params"
import {
  type CustomerAddressUpdateHookInput,
  cartAddressAdapter,
  customerAddressAdapter,
} from "@/lib/storefront-address-adapter"
import type { AddressFormData } from "@/utils/address-validation"

const CART_ID_KEY = "n1_cart_id"
const storefrontQueryKeys = createMedusaStorefrontQueryKeys("n1")
type MedusaProductListQuery = MedusaProductListInput & Record<string, unknown>

const cartStorage = createLocalStorageValueStore({
  key: CART_ID_KEY,
})

const normalizeProductListParams = (
  input: MedusaProductListInput
): MedusaProductListQuery => {
  const normalizedInput = buildProductQueryParams(input)

  return {
    ...normalizedInput,
    country_code: normalizedInput.country_code ?? DEFAULT_COUNTRY_CODE,
    fields: normalizedInput.fields ?? PRODUCT_LIST_FIELDS,
  } as MedusaProductListQuery
}

const storefrontCacheConfig = createCacheConfig({
  realtime: {
    ...appCacheConfig.realtime,
    refetchOnMount: true,
  },
  userData: appCacheConfig.userData,
})

type N1StorefrontConfig = CreateMedusaStorefrontPresetConfig<
  HttpTypes.StoreProduct,
  HttpTypes.StoreProductCategory,
  HttpTypes.StoreCollection,
  HttpTypes.StoreProduct,
  CatalogFacets,
  AddressFormData,
  HttpTypes.StoreAddAddress,
  AddressFormData,
  CustomerAddressUpdateHookInput
>
type N1Storefront = ReturnType<
  typeof createMedusaStorefrontPreset<
    HttpTypes.StoreProduct,
    HttpTypes.StoreProductCategory,
    HttpTypes.StoreCollection,
    HttpTypes.StoreProduct,
    CatalogFacets,
    AddressFormData,
    HttpTypes.StoreAddAddress,
    AddressFormData,
    CustomerAddressUpdateHookInput
  >
>

const storefrontConfig = {
  sdk,
  queryKeyNamespace: "n1",
  cacheConfig: storefrontCacheConfig,
  auth: {
    hooks: {
      invalidateOnAuthChange: {
        removeOnLogout: [storefrontQueryKeys.cart.all()],
      },
    },
  },
  cart: {
    serviceConfig: { isNotFoundError },
    hooks: {
      cartStorage,
      isNotFoundError,
      invalidateOnSuccess: true,
      addressAdapter: cartAddressAdapter,
    },
  },
  products: {
    serviceConfig: {
      defaultListFields: PRODUCT_LIST_FIELDS,
      defaultDetailFields: PRODUCT_DETAILED_FIELDS,
      normalizeListQuery: normalizeProductListParams,
      normalizeDetailQuery: (params: MedusaProductDetailInput) => ({
        handle: params.handle,
        region_id: params.region_id,
        country_code: params.country_code ?? DEFAULT_COUNTRY_CODE,
        province: params.province,
        cart_id: params.cart_id,
        locale: params.locale,
        fields: params.fields ?? PRODUCT_DETAILED_FIELDS,
      }),
      createGlobalFetcher: true,
    },
    hooks: {
      defaultPageSize: PRODUCT_LIMIT,
      requireRegion: true,
      buildListParams: normalizeProductListParams,
      buildPrefetchParams: normalizeProductListParams,
    },
  },
  orders: {
    serviceConfig: {
      defaultFields: "*items",
    },
    hooks: {
      defaultPageSize: 20,
    },
  },
  customers: {
    hooks: {
      addressAdapter: customerAddressAdapter,
      buildUpdateCustomerParams: (
        input: MedusaCustomerProfileUpdateInput & { password?: string }
      ) => {
        const { password: _password, ...rest } = input
        return rest
      },
    },
  },
} satisfies N1StorefrontConfig

export const storefront: N1Storefront =
  createMedusaStorefrontPreset(storefrontConfig)
export const cartFlow: N1Storefront["flows"]["cart"] = storefront.flows.cart
export const checkoutFlow: N1Storefront["flows"]["checkout"] =
  storefront.flows.checkout
