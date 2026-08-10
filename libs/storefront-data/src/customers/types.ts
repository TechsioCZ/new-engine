import type { StorefrontCustomerAddressAdapter } from "../shared/address"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { MutationOptions } from "../shared/hook-types"
import type { QueryKey } from "../shared/query-keys"

export interface CustomerAddressListInputBase {
  enabled?: boolean
}

export interface CustomerAddressInputBase<TMetadata extends object = object> {
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
  metadata?: TMetadata | null
}

export type CustomerAddressCreateInputBase<TMetadata extends object = object> =
  CustomerAddressInputBase<TMetadata>

export type CustomerAddressUpdateInputBase<TMetadata extends object = object> =
  CustomerAddressInputBase<TMetadata> & {
    addressId?: string
  }

export interface CustomerProfileUpdateInputBase<
  TMetadata extends object = object,
> {
  metadata?: TMetadata | null
}

export interface CustomerAddressListResponse<TAddress> {
  addresses: TAddress[]
}

export interface CustomerService<
  TCustomer,
  TAddress,
  TListParams,
  TCreateParams,
  TUpdateParams,
  TUpdateCustomerParams,
> {
  getAddresses: (
    params: TListParams,
    signal?: AbortSignal,
  ) => Promise<CustomerAddressListResponse<TAddress>>
  createAddress: (params: TCreateParams) => Promise<TAddress>
  updateAddress: (addressId: string, params: TUpdateParams) => Promise<TAddress>
  deleteAddress: (addressId: string) => Promise<void>
  updateCustomer?: (params: TUpdateCustomerParams) => Promise<TCustomer>
}

export interface CustomerQueryKeys<TListParams> {
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
