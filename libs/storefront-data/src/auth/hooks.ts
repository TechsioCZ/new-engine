import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { MutationOptions, SuspenseQueryOptions } from "../shared/hook-types"
import {
  createQueryKey,
  type QueryKey,
  type QueryNamespace,
} from "../shared/query-keys"
import { createAuthQueryKeys } from "./query-keys"
import type {
  AuthQueryInput,
  AuthQueryKeys,
  AuthService,
  UseAuthResult,
  UseSuspenseAuthResult,
} from "./types"

export type CreateAuthHooksConfig<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
  TLoginResult = unknown,
  TRegisterResult = unknown,
> = {
  service: AuthService<
    TCustomer,
    TLoginInput,
    TRegisterInput,
    TUpdateInput,
    TCreateCustomerInput,
    TLoginResult,
    TRegisterResult
  >
  queryKeys?: AuthQueryKeys
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  invalidateOnAuthChange?: {
    /**
     * Include default cross-domain keys (`customer`, `orders`).
     * Enabled by default.
     */
    includeDefaults?: boolean
    /** Additional key prefixes to invalidate on auth changes. */
    invalidate?: readonly QueryKey[]
    /** Additional key prefixes to remove when logging out. */
    removeOnLogout?: readonly QueryKey[]
  }
}

export type AuthMutationOptions<TData, TVariables, TContext = unknown> =
  MutationOptions<TData, TVariables, TContext>

export function createAuthHooks<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
  TLoginResult = unknown,
  TRegisterResult = unknown,
>(
  {
    service,
    queryKeys,
    queryKeyNamespace = "storefront-data",
    cacheConfig,
    invalidateOnAuthChange,
  }: CreateAuthHooksConfig<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput,
  TLoginResult,
  TRegisterResult
>
) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createAuthQueryKeys(queryKeyNamespace)
  const includeDefaultInvalidation =
    invalidateOnAuthChange?.includeDefaults ?? true
  const defaultInvalidateKeys = includeDefaultInvalidation
    ? [
        createQueryKey(queryKeyNamespace, "customer"),
        createQueryKey(queryKeyNamespace, "orders"),
      ]
    : []
  const invalidateKeys = [
    ...defaultInvalidateKeys,
    ...(invalidateOnAuthChange?.invalidate ?? []),
  ]
  const removeOnLogoutKeys = [
    ...defaultInvalidateKeys,
    ...(invalidateOnAuthChange?.removeOnLogout ?? []),
  ]

  const invalidateCrossDomain = (queryClient: QueryClient) => {
    for (const queryKey of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey })
    }
  }

  const removeCrossDomainOnLogout = (
    queryClient: QueryClient
  ) => {
    for (const queryKey of removeOnLogoutKeys) {
      queryClient.removeQueries({ queryKey })
    }
  }

  function useAuth(
    options?: AuthQueryInput<TCustomer>
  ): UseAuthResult<TCustomer> {
    const query = useQuery({
      queryKey: resolvedQueryKeys.customer(),
      queryFn: ({ signal }) => service.getCustomer(signal),
      enabled: options?.enabled ?? true,
      retry: false,
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const customer = data ?? null

    return {
      customer,
      isAuthenticated: customer !== null,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      query,
    }
  }

  function useSuspenseAuth(options?: {
    queryOptions?: SuspenseQueryOptions<TCustomer | null>
  }): UseSuspenseAuthResult<TCustomer> {
    // TanStack Query limitation: suspense hooks don't support cancellation.
    const query = useSuspenseQuery<TCustomer | null>({
      queryKey: resolvedQueryKeys.customer(),
      queryFn: ({ signal }) => service.getCustomer(signal),
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query
    const customer = data ?? null

    return {
      customer,
      isAuthenticated: customer !== null,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function useLogin<TContext = unknown>(
    options?: AuthMutationOptions<TLoginResult, TLoginInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TLoginResult, unknown, TLoginInput, TContext>({
      mutationFn: (input: TLoginInput) => service.login(input),
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        invalidateCrossDomain(queryClient)
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

  function useRegister<TContext = unknown>(
    options?: AuthMutationOptions<TRegisterResult, TRegisterInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TRegisterResult, unknown, TRegisterInput, TContext>({
      mutationFn: (input: TRegisterInput) => service.register(input),
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        invalidateCrossDomain(queryClient)
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

  function useCreateCustomer<TContext = unknown>(
    options?: AuthMutationOptions<TCustomer, TCreateCustomerInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TCustomer, unknown, TCreateCustomerInput, TContext>({
      mutationFn: (input: TCreateCustomerInput) => {
        if (!service.createCustomer) {
          throw new Error("createCustomer service is not configured")
        }
        return service.createCustomer(input)
      },
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        invalidateCrossDomain(queryClient)
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

  function useLogout<TContext = unknown>(
    options?: AuthMutationOptions<void, void, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<void, unknown, void, TContext>({
      mutationFn: () => service.logout(),
      onMutate: options?.onMutate,
      onSuccess: (_data, _variables, context) => {
        queryClient.setQueryData(resolvedQueryKeys.customer(), null)
        queryClient.removeQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        removeCrossDomainOnLogout(queryClient)
        options?.onSuccess?.(undefined, undefined, context)
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
    options?: AuthMutationOptions<TCustomer, TUpdateInput, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<TCustomer, unknown, TUpdateInput, TContext>({
      mutationFn: (input: TUpdateInput) => {
        if (!service.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return service.updateCustomer(input)
      },
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        queryClient.setQueryData(resolvedQueryKeys.customer(), data)
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

  function useRefreshAuth<TContext = unknown>(
    options?: AuthMutationOptions<unknown, void, TContext>
  ) {
    const queryClient = useQueryClient()
    return useMutation<unknown, unknown, void, TContext>({
      mutationFn: () => {
        if (!service.refresh) {
          throw new Error("refresh service is not configured")
        }
        return service.refresh()
      },
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        invalidateCrossDomain(queryClient)
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

  return {
    useAuth,
    useSuspenseAuth,
    useLogin,
    useRegister,
    useCreateCustomer,
    useLogout,
    useUpdateCustomer,
    useRefreshAuth,
  }
}
