import type { QueryClient } from "@tanstack/react-query"
import type { CacheOptions } from "./cache-config"
import type { QueryKey } from "./query-keys"

export type PrefetchSkipMode = "fresh" | "any"

const assertNever = (value: never): never => {
  throw new Error(`Unsupported prefetch skip mode: ${String(value)}`)
}

export const isQueryFresh = (
  queryClient: QueryClient,
  queryKey: QueryKey,
  staleTime: number
) => {
  const state = queryClient.getQueryState(queryKey)
  if (!state || state.isInvalidated || state.data === undefined) {
    return false
  }
  return Date.now() - state.dataUpdatedAt < staleTime
}

export const shouldSkipPrefetch = (params: {
  queryClient: QueryClient
  queryKey: QueryKey
  cacheOptions: Pick<CacheOptions, "staleTime">
  skipIfCached: boolean
  skipMode: PrefetchSkipMode
}) => {
  if (!params.skipIfCached) {
    return false
  }

  switch (params.skipMode) {
    case "any":
      return params.queryClient.getQueryData(params.queryKey) !== undefined
    case "fresh":
      return isQueryFresh(
        params.queryClient,
        params.queryKey,
        params.cacheOptions.staleTime
      )
    default:
      return assertNever(params.skipMode)
  }
}
