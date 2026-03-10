import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaAuthService,
  type MedusaAuthCredentials,
  type MedusaRegisterData,
  type MedusaUpdateCustomerData,
} from "@techsio/storefront-data/auth/medusa-service"
import {
  createLocalStorageCartStorage,
} from "@techsio/storefront-data/cart/browser-storage"
import {
  createMedusaCustomerService,
  type MedusaCustomerAddressCreateInput,
  type MedusaCustomerAddressUpdateInput,
  type MedusaCustomerListInput,
  type MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data/customers/medusa-service"
import {
  createMedusaCartFlow,
} from "@techsio/storefront-data/medusa/cart-flow"
import {
  createMedusaCheckoutFlow,
} from "@techsio/storefront-data/medusa/checkout-flow"
import {
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
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import {
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { buildProductQueryParams } from "@/lib/product-query-params"
import { mapAuthError } from "@/lib/auth-messages"
import {
  AddressValidationError,
  isAbortLikeError,
  isNotFoundError,
  logError,
} from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import {
  clearToken,
  getTokenFromStorage,
  isTokenExpired,
} from "@/lib/token-utils"
import {
  type AddressFormData,
  validateAddressForm,
} from "@/utils/address-validation"
import {
  cleanPhoneNumber,
  formatPhoneNumber,
} from "@/utils/format/format-phone-number"
import {
  cleanPostalCode,
  formatPostalCode,
} from "@/utils/format/format-postal-code"

const CART_ID_KEY = "n1_cart_id"
const storefrontQueryKeys = createMedusaStorefrontQueryKeys("n1")
type MedusaProductListQuery = MedusaProductListInput & Record<string, unknown>

export const cartStorage = createLocalStorageCartStorage({
  key: CART_ID_KEY,
})

const normalizeProductListParams = (
  input: MedusaProductListInput
): MedusaProductListQuery => {
  const normalizedInput = buildProductQueryParams(input)

  return {
    ...normalizedInput,
    country_code: normalizedInput.country_code ?? "cz",
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

const isExpectedAuthError = (error: unknown): boolean => {
  if (!(error && typeof error === "object")) {
    return false
  }

  const directStatus =
    "status" in error ? (error as { status?: unknown }).status : null
  if (directStatus === 401 || directStatus === 403) {
    return true
  }

  const responseStatus =
    "response" in error
      ? (error as { response?: { status?: unknown } }).response?.status
      : null

  return responseStatus === 401 || responseStatus === 403
}

const cleanCheckoutAddress = (
  address: AddressFormData
): HttpTypes.StoreAddAddress => {
  const cleaned: HttpTypes.StoreAddAddress = {
    first_name: address.first_name,
    last_name: address.last_name,
    address_1: address.address_1,
    city: address.city,
    postal_code: address.postal_code,
    country_code: address.country_code,
  }

  if (address.address_2?.trim()) {
    cleaned.address_2 = address.address_2
  }
  if (address.company?.trim()) {
    cleaned.company = address.company
  }
  if (address.province?.trim()) {
    cleaned.province = address.province
  }
  if (address.phone?.trim()) {
    cleaned.phone = address.phone
  }

  return cleaned
}

const validateCheckoutAddressInput = (input: AddressFormData) => {
  const errors = validateAddressForm(input)
  const messages = Object.values(errors).filter(Boolean)
  return messages.length ? messages : null
}

export class OrderNotFoundError extends Error {
  constructor(message = "Objednávka nenalezena") {
    super(message)
    this.name = "OrderNotFoundError"
  }
}

const baseAuthService = createMedusaAuthService(sdk)
const baseOrderService = createMedusaOrderService(sdk, {
  defaultFields: "*items",
})
const baseCustomerService = createMedusaCustomerService(sdk)

const normalizeAddressData = <T extends Record<string, unknown>>(data: T): T => {
  const postalCode =
    typeof data.postal_code === "string"
      ? cleanPostalCode(data.postal_code)
      : data.postal_code
  const phone =
    typeof data.phone === "string" ? cleanPhoneNumber(data.phone) : data.phone

  return {
    ...data,
    postal_code: postalCode,
    phone,
  }
}

const hasCompleteAddressFields = (
  data: MedusaCustomerAddressUpdateInput
): boolean =>
  "first_name" in data && "last_name" in data && "address_1" in data

const validateCreateCustomerAddressInput = (
  input: MedusaCustomerAddressCreateInput
) => {
  const validationInput: AddressFormData = {
    ...(input as AddressFormData),
    postal_code: formatPostalCode(input.postal_code ?? ""),
    phone: input.phone ? formatPhoneNumber(input.phone) : "",
  }

  const errors = validateAddressForm(validationInput)
  if (Object.keys(errors).length > 0) {
    throw new AddressValidationError(errors)
  }

  return null
}

const validateUpdateCustomerAddressInput = (
  input: MedusaCustomerAddressUpdateInput
) => {
  if (!hasCompleteAddressFields(input)) {
    return null
  }

  const validationInput: AddressFormData = {
    ...(input as AddressFormData),
    postal_code: formatPostalCode(input.postal_code ?? ""),
    phone: input.phone ? formatPhoneNumber(input.phone) : "",
    country_code: input.country_code ?? "cz",
    first_name: input.first_name ?? "",
    last_name: input.last_name ?? "",
    address_1: input.address_1 ?? "",
    city: input.city ?? "",
  }

  const errors = validateAddressForm(validationInput)
  if (Object.keys(errors).length > 0) {
    throw new AddressValidationError(errors)
  }

  return null
}

type CustomerAddressUpdateHookInput = MedusaCustomerAddressUpdateInput & {
  addressId?: string
}

const buildCustomerUpdateParams = (
  input: CustomerAddressUpdateHookInput
): MedusaCustomerAddressUpdateInput => {
  const { addressId: _addressId, ...rest } = input
  return rest
}

const normalizeCreateCustomerAddressInput = (
  input: MedusaCustomerAddressCreateInput
): MedusaCustomerAddressCreateInput => normalizeAddressData(input)

const normalizeUpdateCustomerAddressInput = (
  input: CustomerAddressUpdateHookInput
): CustomerAddressUpdateHookInput => normalizeAddressData(input)

export const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "n1",
  cacheConfig: storefrontCacheConfig,
  auth: {
    service: {
      async getCustomer(signal?: AbortSignal) {
        const token = getTokenFromStorage()
        if (!token) {
          return null
        }

        if (isTokenExpired(token)) {
          clearToken()
          return null
        }

        try {
          return await baseAuthService.getCustomer(signal)
        } catch (error) {
          if (isAbortLikeError(error)) {
            throw error
          }
          if (!isExpectedAuthError(error)) {
            logError("AuthService.getCustomer", error)
          }
          return null
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
      async logout() {
        return baseAuthService.logout()
      },
      async register(data: MedusaRegisterData) {
        try {
          return await baseAuthService.register(data)
        } catch (error) {
          logError("AuthService.register", error)
          throw new Error(mapAuthError(error))
        }
      },
      async updateCustomer(data: MedusaUpdateCustomerData) {
        if (!baseAuthService.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return baseAuthService.updateCustomer(data)
      },
    },
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: false,
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
      validateShippingAddressInput: validateCheckoutAddressInput,
      validateBillingAddressInput: validateCheckoutAddressInput,
      buildShippingAddress: cleanCheckoutAddress,
      buildBillingAddress: cleanCheckoutAddress,
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
        country_code: params.country_code ?? "cz",
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
      async getAddresses(params: MedusaCustomerListInput, signal?: AbortSignal) {
        try {
          return await baseCustomerService.getAddresses(params, signal)
        } catch (error) {
          if (isAbortLikeError(error)) {
            throw error
          }
          logError("CustomerService.getAddresses", error)
          return { addresses: [] }
        }
      },
      async createAddress(params: MedusaCustomerAddressCreateInput) {
        try {
          return await baseCustomerService.createAddress(params)
        } catch (error) {
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
      buildUpdateParams: buildCustomerUpdateParams,
      buildUpdateCustomerParams: (
        input: MedusaCustomerProfileUpdateInput & { password?: string }
      ) => {
        const { password: _password, ...rest } = input
        return rest
      },
      normalizeCreateAddressInput: normalizeCreateCustomerAddressInput,
      normalizeUpdateAddressInput: normalizeUpdateCustomerAddressInput,
      validateCreateAddressInput: validateCreateCustomerAddressInput,
      validateUpdateAddressInput: validateUpdateCustomerAddressInput,
    },
  },
})

export const cartFlow = createMedusaCartFlow({
  storefront,
  cartStorage,
})

export const checkoutFlow = createMedusaCheckoutFlow({
  storefront,
  cartStorage,
})
