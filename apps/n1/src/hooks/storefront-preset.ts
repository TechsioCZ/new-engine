import type { HttpTypes } from "@medusajs/types"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import {
  type CreateMedusaStorefrontPresetConfig,
  createMedusaStorefrontPreset,
  createMedusaStorefrontQueryKeys,
} from "@techsio/storefront-data/medusa/preset"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/storage-value-store"
import {
  STOREFRONT_QUERY_NAMESPACE,
  orderHooksConfig,
  orderServiceConfig,
  productHooksConfig,
  productServiceConfig,
  storefrontCacheConfig,
} from "@/lib/storefront-config"
import { sdk } from "@/lib/medusa-client"
import {
  type CustomerAddressUpdateHookInput,
  cartAddressAdapter,
  customerAddressAdapter,
} from "@/lib/storefront-address-adapter"
import type { AddressFormData } from "@/utils/address-validation"

const CART_ID_KEY = "n1_cart_id"
const storefrontQueryKeys = createMedusaStorefrontQueryKeys(
  STOREFRONT_QUERY_NAMESPACE
)

const cartStorage = createLocalStorageValueStore({
  key: CART_ID_KEY,
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
  queryKeyNamespace: STOREFRONT_QUERY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  auth: {
    hooks: {
      invalidateOnAuthChange: {
        removeOnLogout: [storefrontQueryKeys.cart.all()],
      },
    },
  },
  cart: {
    hooks: {
      cartStorage,
      invalidateOnSuccess: true,
      addressAdapter: cartAddressAdapter,
    },
  },
  products: {
    serviceConfig: productServiceConfig,
    hooks: productHooksConfig,
  },
  orders: {
    serviceConfig: orderServiceConfig,
    hooks: orderHooksConfig,
  },
  customers: {
    hooks: {
      addressAdapter: customerAddressAdapter,
    },
  },
} satisfies N1StorefrontConfig

export const storefront: N1Storefront =
  createMedusaStorefrontPreset(storefrontConfig)
export const cartFlow: N1Storefront["flows"]["cart"] = storefront.flows.cart
export const checkoutFlow: N1Storefront["flows"]["checkout"] =
  storefront.flows.checkout
