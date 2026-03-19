import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaAuthService,
  type MedusaAuthCredentials,
  type MedusaRegisterData,
  MedusaRegistrationSignInError,
  type MedusaUpdateCustomerData,
} from "@techsio/storefront-data/auth/medusa-service"
import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import {
  createMedusaCustomerService,
  type MedusaCustomerAddressCreateInput,
  type MedusaCustomerAddressUpdateInput,
  type MedusaCustomerListInput,
  type MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data/customers/medusa-service"
import {
  type CreateMedusaStorefrontPresetConfig,
  createMedusaStorefrontPreset,
  createMedusaStorefrontQueryKeys,
} from "@techsio/storefront-data/medusa/preset"
import {
  createMedusaOrderService,
  type MedusaOrderDetailInput,
  type MedusaOrderListInput,
} from "@techsio/storefront-data/orders/medusa-service"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
import { StorefrontAddressValidationError } from "@techsio/storefront-data/shared/address"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { mapAuthError } from "@/lib/auth-messages"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { isAbortLikeError, isNotFoundError, logError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import { OrderNotFoundError } from "@/lib/orders/errors"
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

const baseAuthService = createMedusaAuthService(sdk)
const baseOrderService = createMedusaOrderService(sdk, {
  defaultFields: "*items",
})
const baseCustomerService = createMedusaCustomerService(sdk)

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
    service: {
      async getCustomer(signal?: AbortSignal) {
        try {
          return await baseAuthService.getCustomer(signal)
        } catch (error) {
          if (isAbortLikeError(error)) {
            throw error
          }
          logError("AuthService.getCustomer", error)
          throw new Error("Nepodařilo se ověřit přihlášení")
        }
      },
      async login(credentials: MedusaAuthCredentials) {
        try {
          return await baseAuthService.login(credentials)
        } catch (error) {
          logError("AuthService.login", error)
          throw new Error(mapAuthError(error))
        }
      },
      logout() {
        return baseAuthService.logout()
      },
      async register(data: MedusaRegisterData) {
        try {
          return await baseAuthService.register(data)
        } catch (error) {
          logError("AuthService.register", error)
          if (error instanceof MedusaRegistrationSignInError) {
            throw error
          }
          throw new Error(mapAuthError(error))
        }
      },
      updateCustomer(data: MedusaUpdateCustomerData) {
        if (!baseAuthService.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return baseAuthService.updateCustomer(data)
      },
    },
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
  checkout: {},
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
    service: {
      async getOrders(params: MedusaOrderListInput, signal?: AbortSignal) {
        try {
          const response = await baseOrderService.getOrders(params, signal)
          const sortedOrders = [...(response.orders ?? [])].sort(
            (left, right) =>
              new Date(right.created_at ?? 0).getTime() -
              new Date(left.created_at ?? 0).getTime()
          )

          return {
            orders: sortedOrders,
            count: response.count,
          }
        } catch (error) {
          if (isAbortLikeError(error)) {
            throw error
          }
          logError("OrderService.getOrders", error)
          throw new Error("Nepodařilo se načíst objednávky")
        }
      },
      async getOrder(params: MedusaOrderDetailInput, signal?: AbortSignal) {
        if (!params.id) {
          return null
        }

        try {
          return await baseOrderService.getOrder(params, signal)
        } catch (error) {
          if (isAbortLikeError(error)) {
            throw error
          }
          if (isNotFoundError(error)) {
            throw new OrderNotFoundError()
          }

          logError("OrderService.getOrder", error)
          throw new Error("Nepodařilo se načíst objednávku")
        }
      },
    },
    hooks: {
      defaultPageSize: 20,
    },
  },
  customers: {
    service: {
      async getAddresses(
        params: MedusaCustomerListInput,
        signal?: AbortSignal
      ) {
        try {
          return await baseCustomerService.getAddresses(params, signal)
        } catch (error) {
          if (isAbortLikeError(error)) {
            throw error
          }
          logError("CustomerService.getAddresses", error)
          throw new Error("Nepodařilo se načíst adresy")
        }
      },
      async createAddress(params: MedusaCustomerAddressCreateInput) {
        try {
          return await baseCustomerService.createAddress(params)
        } catch (error) {
          if (error instanceof StorefrontAddressValidationError) {
            throw error
          }
          logError("CustomerService.createAddress", error)
          throw new Error("Nepodařilo se vytvořit adresu")
        }
      },
      async updateAddress(
        addressId: string,
        params: MedusaCustomerAddressUpdateInput
      ) {
        try {
          return await baseCustomerService.updateAddress(addressId, params)
        } catch (error) {
          if (error instanceof StorefrontAddressValidationError) {
            throw error
          }
          logError("CustomerService.updateAddress", error)
          throw new Error("Nepodařilo se aktualizovat adresu")
        }
      },
      async deleteAddress(addressId: string) {
        try {
          await baseCustomerService.deleteAddress(addressId)
        } catch (error) {
          logError("CustomerService.deleteAddress", error)
          throw new Error("Nepodařilo se smazat adresu")
        }
      },
      async updateCustomer(params: MedusaCustomerProfileUpdateInput) {
        try {
          if (!baseCustomerService.updateCustomer) {
            throw new Error("updateCustomer service is not configured")
          }
          return await baseCustomerService.updateCustomer(params)
        } catch (error) {
          logError("CustomerService.updateCustomer", error)
          throw new Error("Nepodařilo se aktualizovat profil")
        }
      },
    },
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
