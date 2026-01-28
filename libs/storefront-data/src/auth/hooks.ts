import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
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
> = {
  service: AuthService<
    TCustomer,
    TLoginInput,
    TRegisterInput,
    TUpdateInput,
    TCreateCustomerInput
  >
  queryKeys?: AuthQueryKeys
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export type AuthMutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: unknown) => void
}

export function createAuthHooks<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput = unknown,
>({
  service,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateAuthHooksConfig<
  TCustomer,
  TLoginInput,
  TRegisterInput,
  TUpdateInput,
  TCreateCustomerInput
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createAuthQueryKeys(queryKeyNamespace)

  function useAuth(options?: AuthQueryInput): UseAuthResult<TCustomer> {
    const { data, isLoading, isFetching, isSuccess, error } = useQuery({
      queryKey: resolvedQueryKeys.customer(),
      queryFn: ({ signal }) => service.getCustomer(signal),
      enabled: options?.enabled ?? true,
      retry: false,
      ...resolvedCacheConfig.userData,
    })

    const customer = data ?? null

    return {
      customer,
      isAuthenticated: customer !== null,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
    }
  }

  function useSuspenseAuth(): UseSuspenseAuthResult<TCustomer> {
    const { data, isFetching } = useSuspenseQuery<TCustomer | null, Error>({
      queryKey: resolvedQueryKeys.customer(),
      queryFn: ({ signal }) => service.getCustomer(signal),
      ...resolvedCacheConfig.userData,
    })
    const customer = data ?? null

    return {
      customer,
      isAuthenticated: customer !== null,
      isFetching,
    }
  }

  function useLogin(options?: AuthMutationOptions<unknown, TLoginInput>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TLoginInput) => service.login(input),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        options?.onSuccess?.(data, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function useRegister(options?: AuthMutationOptions<unknown, TRegisterInput>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TRegisterInput) => service.register(input),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        options?.onSuccess?.(data, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function useCreateCustomer(
    options?: AuthMutationOptions<TCustomer, TCreateCustomerInput>
  ) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TCreateCustomerInput) => {
        if (!service.createCustomer) {
          throw new Error("createCustomer service is not configured")
        }
        return service.createCustomer(input)
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        options?.onSuccess?.(data, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function useLogout(options?: AuthMutationOptions<void, void>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: () => service.logout(),
      onSuccess: () => {
        queryClient.setQueryData(resolvedQueryKeys.customer(), null)
        queryClient.removeQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        options?.onSuccess?.(undefined, undefined)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function useUpdateCustomer(
    options?: AuthMutationOptions<TCustomer, TUpdateInput>
  ) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (input: TUpdateInput) => {
        if (!service.updateCustomer) {
          throw new Error("updateCustomer service is not configured")
        }
        return service.updateCustomer(input)
      },
      onSuccess: (data, variables) => {
        queryClient.setQueryData(resolvedQueryKeys.customer(), data)
        options?.onSuccess?.(data, variables)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  function useRefreshAuth(options?: AuthMutationOptions<unknown, void>) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: () => {
        if (!service.refresh) {
          throw new Error("refresh service is not configured")
        }
        return service.refresh()
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.customer(),
        })
        options?.onSuccess?.(data, undefined)
      },
      onError: (error) => {
        options?.onError?.(error)
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
