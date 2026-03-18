import type {
  DefaultError,
  QueryFunction,
  UseInfiniteQueryOptions,
  UseQueryOptions,
  UseSuspenseQueryOptions,
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
  UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>,
  "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
>

export type QueryFactoryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = {
  queryKey: TQueryKey
  queryFn: QueryFunction<TQueryFnData, TQueryKey>
} & ReadQueryOptions<TQueryFnData, TError, TData, TQueryKey>

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
