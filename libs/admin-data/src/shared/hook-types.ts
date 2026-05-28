import type {
  DefaultError,
  MutationFunction,
  QueryFunction,
  UseMutationOptions,
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
  "enabled" | "queryFn" | "queryKey"
>

export type SuspenseQueryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  "queryFn" | "queryKey"
>

export type QueryFactoryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = {
  queryFn: QueryFunction<TQueryFnData, TQueryKey>
  queryKey: TQueryKey
} & ReadQueryOptions<TQueryFnData, TError, TData, TQueryKey>

export type WriteMutationOptions<
  TData,
  TVariables,
  TError = DefaultError,
  TContext = unknown,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn">

export type MutationFactoryOptions<
  TData,
  TVariables,
  TError = DefaultError,
  TContext = unknown,
> = {
  mutationFn: MutationFunction<TData, TVariables>
} & WriteMutationOptions<TData, TVariables, TError, TContext>
