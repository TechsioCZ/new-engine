import type {
  DefaultError,
  UseInfiniteQueryResult,
  UseQueryResult,
  UseSuspenseQueryResult,
} from "@tanstack/react-query"

export type QueryResult<TData, TError = DefaultError> = UseQueryResult<
  TData,
  TError
>

export type SuspenseQueryResult<
  TData,
  TError = DefaultError,
> = UseSuspenseQueryResult<TData, TError>

export type InfiniteQueryResult<
  TData,
  TError = DefaultError,
> = UseInfiniteQueryResult<TData, TError>

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
