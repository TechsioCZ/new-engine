import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createCustomerQueryKeys } from "./query-keys"
import type {
  CustomerAddressCreateInputBase,
  CustomerAddressListInputBase,
  CustomerAddressListResponse,
  CustomerAddressUpdateInputBase,
  CustomerAddressValidationResult,
  CustomerMutationOptions,
  CustomerProfileUpdateInputBase,
  CustomerQueryKeys,
  CustomerService,
  UseCustomerAddressesResult,
  UseSuspenseCustomerAddressesResult,
} from "./types"

const handleAddressValidation = (result: CustomerAddressValidationResult) => {
  if (!result) {
    return
  }
  if (result instanceof Error) {
    throw result
  }
  if (Array.isArray(result)) {
    throw new Error(result.filter(Boolean).join(", "))
  }
  if (typeof result === "string") {
    throw new Error(result)
  }
}

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
  buildCreateParams?: (input: TCreateInput) => TCreateParams
  buildUpdateParams?: (input: TUpdateInput) => TUpdateParams
  buildUpdateCustomerParams?: (
    input: TUpdateCustomerInput
  ) => TUpdateCustomerParams
  normalizeCreateAddressInput?: (input: TCreateInput) => TCreateInput
  normalizeUpdateAddressInput?: (input: TUpdateInput) => TUpdateInput
  validateCreateAddressInput?: (
    input: TCreateInput
  ) => CustomerAddressValidationResult
  validateUpdateAddressInput?: (
    input: TUpdateInput
  ) => CustomerAddressValidationResult
  queryKeys?: CustomerQueryKeys<TListParams>
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
  TCreateInput extends CustomerAddressCreateInputBase = CustomerAddressCreateInputBase,
  TCreateParams = TCreateInput,
  TUpdateInput extends CustomerAddressUpdateInputBase = CustomerAddressUpdateInputBase,
  TUpdateParams = TUpdateInput,
  TUpdateCustomerInput extends CustomerProfileUpdateInputBase = CustomerProfileUpdateInputBase,
  TUpdateCustomerParams = TUpdateCustomerInput,
>({
  service,
  buildListParams,
  buildCreateParams,
  buildUpdateParams,
  buildUpdateCustomerParams,
  normalizeCreateAddressInput,
  normalizeUpdateAddressInput,
  validateCreateAddressInput,
  validateUpdateAddressInput,
  queryKeys,
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
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildCreate =
    buildCreateParams ??
    ((input: TCreateInput) => input as unknown as TCreateParams)
  const buildUpdate =
    buildUpdateParams ??
    ((input: TUpdateInput) => input as unknown as TUpdateParams)
  const buildUpdateCustomer =
    buildUpdateCustomerParams ??
    ((input: TUpdateCustomerInput) => input as unknown as TUpdateCustomerParams)

  function useCustomerAddresses(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<
        CustomerAddressListResponse<TAddress>
      >
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
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      query,
    }
  }

  function useSuspenseCustomerAddresses(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<
        CustomerAddressListResponse<TAddress>
      >
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
        const normalized = normalizeCreateAddressInput
          ? normalizeCreateAddressInput(input)
          : input
        handleAddressValidation(validateCreateAddressInput?.(normalized))
        return service.createAddress(buildCreate(normalized))
      },
      onMutate: options?.onMutate,
      onSuccess: (address, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
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
        const normalized = normalizeUpdateAddressInput
          ? normalizeUpdateAddressInput(input)
          : input
        const updateInput = {
          ...(normalized as TUpdateInput & { addressId?: string }),
        }
        delete updateInput.addressId
        handleAddressValidation(validateUpdateAddressInput?.(normalized))
        return service.updateAddress(addressId, buildUpdate(updateInput))
      },
      onMutate: options?.onMutate,
      onSuccess: (address, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
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
    options?: CustomerMutationOptions<void, { addressId?: string }, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<void, unknown, { addressId?: string }, TContext>({
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

