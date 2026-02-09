import type { QueryClient } from "@tanstack/react-query"
import type { CacheOptions } from "./cache-config"
import type { QueryKey } from "./query-keys"

export type PrefetchSkipMode = "fresh" | "any"

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

  if (params.skipMode === "any") {
    return params.queryClient.getQueryData(params.queryKey) !== undefined
  }

  return isQueryFresh(
    params.queryClient,
    params.queryKey,
    params.cacheOptions.staleTime
  )
}
