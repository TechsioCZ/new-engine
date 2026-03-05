import type { HttpTypes } from "@medusajs/types"
import { createCustomerHooks } from "@techsio/storefront-data/customers/hooks"
import {
  createMedusaCustomerService,
  type MedusaCustomerAddressCreateInput,
  type MedusaCustomerAddressUpdateInput,
  type MedusaCustomerListInput,
  type MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data/customers/medusa-service"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { AddressValidationError, logError } from "@/lib/errors"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import type { AddressFormData } from "@/utils/address-validation"
import { validateAddressForm } from "@/utils/address-validation"
import {
  cleanPhoneNumber,
  formatPhoneNumber,
} from "@/utils/format/format-phone-number"
import {
  cleanPostalCode,
  formatPostalCode,
} from "@/utils/format/format-postal-code"

export type AddressListInput = {
  enabled?: boolean
}

export type CreateAddressData = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
}

export type UpdateAddressData = Partial<CreateAddressData>

export type CustomerUpdateInput = {
  first_name?: string
  last_name?: string
  phone?: string
  password?: string
  metadata?: Record<string, unknown>
}

type UpdateAddressInput = UpdateAddressData & {
  addressId?: string
}

const customerQueryKeys = {
  all: () => queryKeys.customer.all(),
  profile: () => queryKeys.customer.profile(),
  addresses: (params: MedusaCustomerListInput) =>
    [...queryKeys.customer.all(), "addresses", params] as const,
}

const storefrontCacheConfig = createCacheConfig({
  userData: appCacheConfig.userData,
})

const baseCustomerService = createMedusaCustomerService(sdk)

function cleanAddressData<T extends Record<string, unknown>>(data: T): T {
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

function hasCompleteAddressFields(data: UpdateAddressData): boolean {
  return "first_name" in data && "last_name" in data && "address_1" in data
}

const validateCreateAddressInput = (input: CreateAddressData) => {
  const validationInput: AddressFormData = {
    ...(input as AddressFormData),
    postal_code: formatPostalCode(input.postal_code),
    phone: input.phone ? formatPhoneNumber(input.phone) : "",
  }
  const errors = validateAddressForm(validationInput)
  if (Object.keys(errors).length > 0) {
    throw new AddressValidationError(errors)
  }
  return null
}

const validateUpdateAddressInput = (input: UpdateAddressInput) => {
  const { addressId: _addressId, ...data } = input

  if (!hasCompleteAddressFields(data)) {
    return null
  }

  const validationInput: AddressFormData = {
    ...(data as AddressFormData),
    postal_code: formatPostalCode(data.postal_code ?? ""),
    phone: data.phone ? formatPhoneNumber(data.phone) : "",
    country_code: data.country_code ?? "cz",
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    address_1: data.address_1 ?? "",
    city: data.city ?? "",
  }
  const errors = validateAddressForm(validationInput)
  if (Object.keys(errors).length > 0) {
    throw new AddressValidationError(errors)
  }
  return null
}

export const customerHooks = createCustomerHooks<
  HttpTypes.StoreCustomer,
  HttpTypes.StoreCustomerAddress,
  AddressListInput,
  MedusaCustomerListInput,
  CreateAddressData,
  MedusaCustomerAddressCreateInput,
  UpdateAddressInput,
  MedusaCustomerAddressUpdateInput,
  CustomerUpdateInput,
  MedusaCustomerProfileUpdateInput
>({
  service: {
    async getAddresses(params, signal) {
      try {
        return await baseCustomerService.getAddresses(params, signal)
      } catch (error) {
        logError("CustomerService.getAddresses", error)
        return { addresses: [] }
      }
    },

    async createAddress(params) {
      try {
        return await baseCustomerService.createAddress(params)
      } catch (error) {
        logError("CustomerService.createAddress", error)
        throw new Error("Nepodařilo se vytvořit adresu")
      }
    },

    async updateAddress(addressId, params) {
      try {
        return await baseCustomerService.updateAddress(addressId, params)
      } catch (error) {
        logError("CustomerService.updateAddress", error)
        throw new Error("Nepodařilo se aktualizovat adresu")
      }
    },

    async deleteAddress(addressId) {
      try {
        await baseCustomerService.deleteAddress(addressId)
      } catch (error) {
        logError("CustomerService.deleteAddress", error)
        throw new Error("Nepodařilo se smazat adresu")
      }
    },

    async updateCustomer(params) {
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
  buildListParams: (input) => input,
  buildCreateParams: (input) => input,
  buildUpdateParams: (input) => {
    const { addressId: _addressId, ...rest } = input
    return rest
  },
  buildUpdateCustomerParams: (input) => {
    const { password: _password, ...rest } = input
    return rest
  },
  normalizeCreateAddressInput: (input) => cleanAddressData(input),
  normalizeUpdateAddressInput: (input) => cleanAddressData(input),
  validateCreateAddressInput,
  validateUpdateAddressInput,
  queryKeys: customerQueryKeys,
  authQueryKeys: {
    customer: () => queryKeys.customer.profile(),
  },
  queryKeyNamespace: "n1",
  cacheConfig: storefrontCacheConfig,
})
