import type {
  DefaultError,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseQueryOptions,
  UseQueryResult,
  UseSuspenseQueryOptions,
  UseSuspenseQueryResult,
} from "@tanstack/react-query"
import type { QueryKey } from "./query-keys"

export type ReadQueryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  "queryKey" | "queryFn" | "enabled"
>

export type SuspenseQueryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  "queryKey" | "queryFn"
>

export type InfiniteQueryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >,
  "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
>

export type QueryResult<TData, TError = DefaultError> = UseQueryResult<
  TData,
  TError
>

export type SuspenseQueryResult<TData, TError = DefaultError> =
  UseSuspenseQueryResult<TData, TError>

export type InfiniteQueryResult<TData, TError = DefaultError> =
  UseInfiniteQueryResult<TData, TError>

export type ReadResultBase<TQueryResult> = {
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  query: TQueryResult
}

export type SuspenseResultBase<TQueryResult> = {
  isLoading: false
  isFetching: boolean
  isSuccess: true
  error: null
  query: TQueryResult
}

export type MutationOptions<TData, TVariables, TContext = unknown> = {
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => void
  onError?: (
    error: unknown,
    variables: TVariables,
    context: TContext | undefined
  ) => void
  onSettled?: (
    data: TData | undefined,
    error: unknown | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void
}
