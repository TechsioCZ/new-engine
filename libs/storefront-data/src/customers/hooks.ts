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
import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
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

export interface CreateCustomerHooksConfig<
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
> {
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
    input: TUpdateCustomerInput,
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
  TCreateInput extends CustomerAddressCreateInputBase =
    CustomerAddressCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput extends CustomerAddressUpdateInputBase =
    CustomerAddressUpdateInputBase,
  TUpdateParams = TUpdateInput,
  TUpdateCustomerInput extends CustomerProfileUpdateInputBase =
    CustomerProfileUpdateInputBase,
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
    buildListParams ??
    ((input: TListInput) => ({ ...input }) as TListInput & TListParams)
  const buildCreate: (
    input: TCreateInput,
    context: StorefrontCustomerCreateAddressContext,
  ) => TCreateParams =
    addressAdapter?.toCreateParams ??
    ((input: TCreateInput) => ({ ...input }) as TCreateInput & TCreateParams)
  const buildUpdate: (
    input: TUpdateInput,
    context: StorefrontCustomerUpdateAddressContext,
  ) => TUpdateParams =
    addressAdapter?.toUpdateParams ??
    ((input: TUpdateInput) => {
      const { addressId: _addressId, ...restUpdateInput } =
        input as TUpdateInput & {
          addressId?: string
        }
      return { ...restUpdateInput } as typeof restUpdateInput & TUpdateParams
    })
  const buildUpdateCustomer =
    buildUpdateCustomerParams ??
    ((input: TUpdateCustomerInput) =>
      ({ ...input }) as TUpdateCustomerInput & TUpdateCustomerParams)

  function useCustomerAddresses(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CustomerAddressListResponse<TAddress>>
    },
  ): UseCustomerAddressesResult<TAddress> {
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const queryKey = resolvedQueryKeys.addresses(listParams)
    const enabled = inputEnabled ?? true

    const query = useQuery({
      enabled,
      queryFn: async ({ signal }) =>
        await service.getAddresses(listParams, signal),
      queryKey,
      ...resolvedCacheConfig.userData,
      ...options?.queryOptions,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      addresses: data?.addresses ?? [],
      error: toErrorMessage(error),
      isFetching,
      isLoading,
      isSuccess,
      query,
    }
  }

  function useSuspenseCustomerAddresses(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<CustomerAddressListResponse<TAddress>>
    },
  ): UseSuspenseCustomerAddressesResult<TAddress> {
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const query = useSuspenseQuery({
      queryFn: async ({ signal }) =>
        await service.getAddresses(listParams, signal),
      queryKey: resolvedQueryKeys.addresses(listParams),
      ...resolvedCacheConfig.userData,
      ...options?.queryOptions,
    })
    const { data, isFetching } = query

    return {
      addresses: data?.addresses ?? [],
      error: null,
      isFetching,
      isLoading: false,
      isSuccess: true,
      query,
    }
  }

  function useCreateCustomerAddress<TContext = unknown>(
    options?: CustomerMutationOptions<TAddress, TCreateInput, TContext>,
  ) {
    const queryClient = useQueryClient()
    return useMutation<TAddress, unknown, TCreateInput, TContext>({
      mutationFn: async (input: TCreateInput) => {
        const normalized = addressAdapter?.normalizeCreate
          ? addressAdapter.normalizeCreate(input, { mode: "create" })
          : input
        assertStorefrontAddressValidation(
          addressAdapter?.validateCreate?.(normalized, { mode: "create" }),
        )
        return await service.createAddress(
          buildCreate(normalized, { mode: "create" }),
        )
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (address, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        await queryClient.invalidateQueries({
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
    options?: CustomerMutationOptions<TAddress, TUpdateInput, TContext>,
  ) {
    const queryClient = useQueryClient()
    return useMutation<TAddress, unknown, TUpdateInput, TContext>({
      mutationFn: async (input: TUpdateInput) => {
        const { addressId } = input
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
          }),
        )
        return await service.updateAddress(
          addressId,
          buildUpdate(normalized, {
            mode: "update",
          }),
        )
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (address, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        await queryClient.invalidateQueries({
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
    options?: CustomerMutationOptions<void, { addressId: string }, TContext>,
  ) {
    const queryClient = useQueryClient()
    return useMutation<void, unknown, { addressId: string }, TContext>({
      mutationFn: async ({ addressId }) => {
        if (!addressId) {
          throw new Error("Address id is required")
        }
        return await service.deleteAddress(addressId)
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        await queryClient.invalidateQueries({
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
    options?: CustomerMutationOptions<
      TCustomer,
      TUpdateCustomerInput,
      TContext
    >,
  ) {
    const queryClient = useQueryClient()
    return useMutation<TCustomer, unknown, TUpdateCustomerInput, TContext>({
      mutationFn: async (input: TUpdateCustomerInput) => {
        if (!service.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return await service.updateCustomer(buildUpdateCustomer(input))
      },
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (customer, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.profile(),
        })
        await queryClient.invalidateQueries({
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
    useCreateCustomerAddress,
    useCustomerAddresses,
    useDeleteCustomerAddress,
    useSuspenseCustomerAddresses,
    useUpdateCustomer,
    useUpdateCustomerAddress,
  }
}

export type CustomerHooks<
  TCustomer,
  TAddress,
  TListInput extends CustomerAddressListInputBase,
  TListParams = TListInput,
  TCreateInput extends CustomerAddressCreateInputBase =
    CustomerAddressCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput extends CustomerAddressUpdateInputBase =
    CustomerAddressUpdateInputBase,
  TUpdateParams = TUpdateInput,
  TUpdateCustomerInput extends CustomerProfileUpdateInputBase =
    CustomerProfileUpdateInputBase,
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
