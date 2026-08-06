import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { QueryClient, UseMutationResult } from "@tanstack/react-query"

import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  MutationOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { createQueryKey } from "../shared/query-keys"
import type { QueryKey, QueryNamespace } from "../shared/query-keys"
import { createAuthQueryKeys } from "./query-keys"
import type {
  AuthQueryInput,
  AuthQueryKeys,
  AuthService,
  UseAuthResult,
  UseSuspenseAuthResult,
} from "./types"

export interface CreateAuthHooksConfig<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
  TLoginResult = unknown,
  TRegisterResult = unknown,
> {
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

export type AuthMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
> = MutationOptions<TData, TVariables, TContext>

export const createAuthHooks = function createAuthHooks<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
  TLoginResult = unknown,
  TRegisterResult = unknown,
>({
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
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys = queryKeys ?? createAuthQueryKeys(queryKeyNamespace)
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

  const invalidateCrossDomain = async (queryClient: QueryClient) => {
    await Promise.all(
      invalidateKeys.map(async (queryKey) => {
        await queryClient.invalidateQueries({ queryKey })
      }),
    )
  }

  const removeCrossDomainOnLogout = (queryClient: QueryClient) => {
    for (const queryKey of removeOnLogoutKeys) {
      queryClient.removeQueries({ queryKey })
    }
  }

  const useAuth = (
    options?: AuthQueryInput<TCustomer>,
  ): UseAuthResult<TCustomer> => {
    const query = useQuery({
      enabled: options?.enabled ?? true,
      queryFn: async ({ signal }) => await service.getCustomer(signal),
      queryKey: resolvedQueryKeys.customer(),
      retry: false,
      ...resolvedCacheConfig.userData,
      ...options?.queryOptions,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const customer = data ?? null

    return {
      customer,
      error: toErrorMessage(error),
      isAuthenticated: customer !== null,
      isFetching,
      isLoading,
      isSuccess,
      query,
    }
  }

  const useSuspenseAuth = (options?: {
    queryOptions?: SuspenseQueryOptions<TCustomer | null>
  }): UseSuspenseAuthResult<TCustomer> => {
    // TanStack Query limitation: cancellation does not work with Suspense hooks.
    // Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation#limitations
    const query = useSuspenseQuery<TCustomer | null>({
      queryFn: async ({ signal }) => await service.getCustomer(signal),
      queryKey: resolvedQueryKeys.customer(),
      ...resolvedCacheConfig.userData,
      ...options?.queryOptions,
    })
    const { data, isFetching } = query
    const customer = data ?? null

    return {
      customer,
      error: null,
      isAuthenticated: customer !== null,
      isFetching,
      isLoading: false,
      isSuccess: true,
      query,
    }
  }

  const useLogin = <TContext = unknown>(
    options?: AuthMutationOptions<TLoginResult, TLoginInput, TContext>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation<TLoginResult, unknown, TLoginInput, TContext>({
      mutationFn: async (input: TLoginInput) => await service.login(input),
      retry: false,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (data, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        await invalidateCrossDomain(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
    })
  }

  const useRegister = <TContext = unknown>(
    options?: AuthMutationOptions<TRegisterResult, TRegisterInput, TContext>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation<TRegisterResult, unknown, TRegisterInput, TContext>({
      mutationFn: async (input: TRegisterInput) =>
        await service.register(input),
      retry: false,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (data, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        await invalidateCrossDomain(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
    })
  }

  const useCreateCustomer = <TContext = unknown>(
    options?: AuthMutationOptions<TCustomer, TCreateCustomerInput, TContext>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation<TCustomer, unknown, TCreateCustomerInput, TContext>({
      mutationFn: async (input: TCreateCustomerInput) => {
        if (!service.createCustomer) {
          throw new Error("createCustomer service is not configured")
        }
        return await service.createCustomer(input)
      },
      retry: false,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (data, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        await invalidateCrossDomain(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
    })
  }

  const useLogout = <TContext = unknown>(
    options?: AuthMutationOptions<void, void, TContext>,
  ): UseMutationResult<void, unknown, void, TContext> => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async () => {
        await service.logout()
      },
      retry: false,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: (_data, _variables, context) => {
        queryClient.setQueryData(resolvedQueryKeys.customer(), null)
        queryClient.removeQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        removeCrossDomainOnLogout(queryClient)
        options?.onSuccess?.(undefined, undefined, context)
      },
    })
  }

  const useUpdateCustomer = <TContext = unknown>(
    options?: AuthMutationOptions<TCustomer, TUpdateInput, TContext>,
  ) => {
    const queryClient = useQueryClient()
    return useMutation<TCustomer, unknown, TUpdateInput, TContext>({
      mutationFn: async (input: TUpdateInput) => {
        if (!service.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return await service.updateCustomer(input)
      },
      retry: false,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: (data, variables, context) => {
        queryClient.setQueryData(resolvedQueryKeys.customer(), data)
        options?.onSuccess?.(data, variables, context)
      },
    })
  }

  const useRefreshAuth = <TContext = unknown>(
    options?: AuthMutationOptions<unknown, void, TContext>,
  ): UseMutationResult<unknown, unknown, void, TContext> => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async () => {
        if (!service.refresh) {
          throw new Error("refresh service is not configured")
        }
        return await service.refresh()
      },
      retry: false,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (data, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        await invalidateCrossDomain(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
    })
  }

  return {
    useAuth,
    useCreateCustomer,
    useLogin,
    useLogout,
    useRefreshAuth,
    useRegister,
    useSuspenseAuth,
    useUpdateCustomer,
  }
}

export type AuthHooks<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
  TLoginResult = unknown,
  TRegisterResult = unknown,
> = ReturnType<
  typeof createAuthHooks<
    TCustomer,
    TLoginInput,
    TRegisterInput,
    TUpdateInput,
    TCreateCustomerInput,
    TLoginResult,
    TRegisterResult
  >
>
