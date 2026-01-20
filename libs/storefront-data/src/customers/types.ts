import type { QueryKey } from "../shared/query-keys"

export type CustomerAddressListInputBase = {
  enabled?: boolean
}

export type CustomerAddressInputBase = {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
  phone?: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
  metadata?: Record<string, unknown>
}

export type CustomerAddressCreateInputBase = CustomerAddressInputBase

export type CustomerAddressUpdateInputBase = CustomerAddressInputBase & {
  addressId?: string
}

export type CustomerProfileUpdateInputBase = {
  metadata?: Record<string, unknown>
}

export type CustomerAddressListResponse<TAddress> = {
  addresses: TAddress[]
}

export type CustomerService<
  TCustomer,
  TAddress,
  TListParams,
  TCreateParams,
  TUpdateParams,
  TUpdateCustomerParams,
> = {
  getAddresses: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<CustomerAddressListResponse<TAddress>>
  createAddress: (params: TCreateParams) => Promise<TAddress>
  updateAddress: (addressId: string, params: TUpdateParams) => Promise<TAddress>
  deleteAddress: (addressId: string) => Promise<void>
  updateCustomer?: (params: TUpdateCustomerParams) => Promise<TCustomer>
}

export type CustomerQueryKeys<TListParams> = {
  all: () => QueryKey
  profile: () => QueryKey
  addresses: (params: TListParams) => QueryKey
}

export type UseCustomerAddressesResult<TAddress> = {
  addresses: TAddress[]
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
}

export type CustomerMutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: unknown) => void
}

export type CustomerAddressValidationResult =
  | string
  | string[]
  | Error
  | null
  | undefined
