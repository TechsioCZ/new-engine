import type { StorefrontCustomerAddressAdapter } from "../shared/address"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { MutationOptions } from "../shared/hook-types"
import type { QueryKey } from "../shared/query-keys"

export type CustomerAddressListInputBase = {
  enabled?: boolean
}

export type CustomerAddressInputBase = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
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

export type UseCustomerAddressesResult<TAddress> = ReadResultBase<
  QueryResult<CustomerAddressListResponse<TAddress>>
> & {
  addresses: TAddress[]
}

export type UseSuspenseCustomerAddressesResult<TAddress> = SuspenseResultBase<
  SuspenseQueryResult<CustomerAddressListResponse<TAddress>>
> & {
  addresses: TAddress[]
}

export type CustomerMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
> = MutationOptions<TData, TVariables, TContext>

export type CustomerAddressAdapter<
  TCreateInput = CustomerAddressCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput = TCreateInput & { addressId?: string },
  TUpdateParams = TCreateParams,
> = StorefrontCustomerAddressAdapter<
  TCreateInput,
  TCreateParams,
  TUpdateInput,
  TUpdateParams
>
