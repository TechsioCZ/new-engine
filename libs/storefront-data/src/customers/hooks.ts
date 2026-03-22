import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { AuthQueryKeys } from "../auth/types"
import type {
  StorefrontCustomerCreateAddressContext,
  StorefrontCustomerUpdateAddressContext,
} from "../shared/address"
import { assertStorefrontAddressValidation } from "../shared/address"
import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { createQueryKey, type QueryNamespace } from "../shared/query-keys"
import { createCustomerQueryKeys } from "./query-keys"
import type {
  CustomerAddressAdapter,
  CustomerAddressCreateInputBase,
  CustomerAddressListInputBase,
  CustomerAddressListResponse,
  CustomerAddressUpdateInputBase,
  CustomerMutationOptions,
  CustomerProfileUpdateInputBase,
  CustomerQueryKeys,
  CustomerService,
  UseCustomerAddressesResult,
  UseSuspenseCustomerAddressesResult,
} from "./types"

export type CreateCustomerHooksConfig<
  TCustomer,
  TAddress,
  TListInput extends CustomerAddressListInputBase,
  TListParams,
  TCreateInput extends CustomerAddressCreateInputBase,
  TCreateParams,
  TUpdateInput extends CustomerAddressUpdateInputBase,
  TUpdateParams,
  TUpdateCustomerInput extends CustomerProfileUpdateInputBase,
  TUpdateCustomerParams,
> = {
  service: CustomerService<
    TCustomer,
    TAddress,
    TListParams,
    TCreateParams,
    TUpdateParams,
    TUpdateCustomerParams
  >
  buildListParams?: (input: TListInput) => TListParams
  addressAdapter?: CustomerAddressAdapter<
    TCreateInput,
    TCreateParams,
    TUpdateInput,
    TUpdateParams
  >
  buildUpdateCustomerParams?: (
    input: TUpdateCustomerInput
  ) => TUpdateCustomerParams
  queryKeys?: CustomerQueryKeys<TListParams>
  authQueryKeys?: Pick<AuthQueryKeys, "customer">
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

/**
 * Create customer hooks with strongly-typed address/profile mappers.
 *
 * @example
 * const { useCustomerAddresses, useUpdateCustomer } = createCustomerHooks({
 *   service,
 *   buildListParams: (input) => ({ ...input }),
 * })
 */
export function createCustomerHooks<
  TCustomer,
  TAddress,
  TListInput extends CustomerAddressListInputBase,
  TListParams = TListInput,
  TCreateInput extends
    CustomerAddressCreateInputBase = CustomerAddressCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput extends
    CustomerAddressUpdateInputBase = CustomerAddressUpdateInputBase,
  TUpdateParams = TUpdateInput,
  TUpdateCustomerInput extends
    CustomerProfileUpdateInputBase = CustomerProfileUpdateInputBase,
  TUpdateCustomerParams = TUpdateCustomerInput,
>({
  service,
  buildListParams,
  addressAdapter,
  buildUpdateCustomerParams,
  queryKeys,
  authQueryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateCustomerHooksConfig<
  TCustomer,
  TAddress,
  TListInput,
  TListParams,
  TCreateInput,
  TCreateParams,
  TUpdateInput,
  TUpdateParams,
  TUpdateCustomerInput,
  TUpdateCustomerParams
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createCustomerQueryKeys<TListParams>(queryKeyNamespace)
  const resolvedAuthQueryKeys = authQueryKeys ?? {
    customer: () => createQueryKey(queryKeyNamespace, "auth", "customer"),
  }
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildCreate: (
    input: TCreateInput,
    context: StorefrontCustomerCreateAddressContext
  ) => TCreateParams =
    addressAdapter?.toCreateParams ??
    ((input: TCreateInput) => input as unknown as TCreateParams)
  const buildUpdate: (
    input: TUpdateInput,
    context: StorefrontCustomerUpdateAddressContext
  ) => TUpdateParams =
    addressAdapter?.toUpdateParams ??
    ((input: TUpdateInput) => {
      const { addressId: _addressId, ...restUpdateInput } =
        input as TUpdateInput & {
          addressId?: string
        }
      return restUpdateInput as unknown as TUpdateParams
    })
  const buildUpdateCustomer =
    buildUpdateCustomerParams ??
    ((input: TUpdateCustomerInput) => input as unknown as TUpdateCustomerParams)

  function useCustomerAddresses(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CustomerAddressListResponse<TAddress>>
    }
  ): UseCustomerAddressesResult<TAddress> {
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const queryKey = resolvedQueryKeys.addresses(listParams)
    const enabled = inputEnabled ?? true

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getAddresses(listParams, signal),
      enabled,
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      addresses: data?.addresses ?? [],
      isLoading,
      isFetching,
      isSuccess,
      error: toErrorMessage(error),
      query,
    }
  }

  function useSuspenseCustomerAddresses(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<CustomerAddressListResponse<TAddress>>
    }
  ): UseSuspenseCustomerAddressesResult<TAddress> {
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.addresses(listParams),
      queryFn: ({ signal }) => service.getAddresses(listParams, signal),
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    return {
      addresses: data?.addresses ?? [],
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function useCreateCustomerAddress<TContext = unknown>(
    options?: CustomerMutationOptions<TAddress, TCreateInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TAddress, unknown, TCreateInput, TContext>({
      mutationFn: (input: TCreateInput) => {
        const normalized = addressAdapter?.normalizeCreate
          ? addressAdapter.normalizeCreate(input, { mode: "create" })
          : input
        assertStorefrontAddressValidation(
          addressAdapter?.validateCreate?.(normalized, { mode: "create" })
        )
        return service.createAddress(
          buildCreate(normalized, { mode: "create" })
        )
      },
      onMutate: options?.onMutate,
      onSuccess: (address, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        queryClient.invalidateQueries({
          queryKey: resolvedAuthQueryKeys.customer(),
        })
        options?.onSuccess?.(address, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useUpdateCustomerAddress<TContext = unknown>(
    options?: CustomerMutationOptions<TAddress, TUpdateInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TAddress, unknown, TUpdateInput, TContext>({
      mutationFn: (input: TUpdateInput) => {
        const addressId = input.addressId
        if (!addressId) {
          throw new Error("Address id is required")
        }
        const normalized = addressAdapter?.normalizeUpdate
          ? addressAdapter.normalizeUpdate(input, {
              mode: "update",
            })
          : input
        assertStorefrontAddressValidation(
          addressAdapter?.validateUpdate?.(normalized, {
            mode: "update",
          })
        )
        return service.updateAddress(
          addressId,
          buildUpdate(normalized, {
            mode: "update",
          })
        )
      },
      onMutate: options?.onMutate,
      onSuccess: (address, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        queryClient.invalidateQueries({
          queryKey: resolvedAuthQueryKeys.customer(),
        })
        options?.onSuccess?.(address, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useDeleteCustomerAddress<TContext = unknown>(
    options?: CustomerMutationOptions<void, { addressId: string }, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<void, unknown, { addressId: string }, TContext>({
      mutationFn: ({ addressId }) => {
        if (!addressId) {
          throw new Error("Address id is required")
        }
        return service.deleteAddress(addressId)
      },
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        queryClient.invalidateQueries({
          queryKey: resolvedAuthQueryKeys.customer(),
        })
        options?.onSuccess?.(data, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function useUpdateCustomer<TContext = unknown>(
    options?: CustomerMutationOptions<TCustomer, TUpdateCustomerInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TCustomer, unknown, TUpdateCustomerInput, TContext>({
      mutationFn: (input: TUpdateCustomerInput) => {
        if (!service.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return service.updateCustomer(buildUpdateCustomer(input))
      },
      onMutate: options?.onMutate,
      onSuccess: (customer, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.profile(),
        })
        queryClient.invalidateQueries({
          queryKey: resolvedAuthQueryKeys.customer(),
        })
        options?.onSuccess?.(customer, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  return {
    useCustomerAddresses,
    useSuspenseCustomerAddresses,
    useCreateCustomerAddress,
    useUpdateCustomerAddress,
    useDeleteCustomerAddress,
    useUpdateCustomer,
  }
}

export type CustomerHooks<
  TCustomer,
  TAddress,
  TListInput extends CustomerAddressListInputBase,
  TListParams = TListInput,
  TCreateInput extends
    CustomerAddressCreateInputBase = CustomerAddressCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput extends
    CustomerAddressUpdateInputBase = CustomerAddressUpdateInputBase,
  TUpdateParams = TUpdateInput,
  TUpdateCustomerInput extends
    CustomerProfileUpdateInputBase = CustomerProfileUpdateInputBase,
  TUpdateCustomerParams = TUpdateCustomerInput,
> = ReturnType<
  typeof createCustomerHooks<
    TCustomer,
    TAddress,
    TListInput,
    TListParams,
    TCreateInput,
    TCreateParams,
    TUpdateInput,
    TUpdateParams,
    TUpdateCustomerInput,
    TUpdateCustomerParams
  >
>
