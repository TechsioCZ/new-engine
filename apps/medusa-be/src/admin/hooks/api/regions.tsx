import type { HttpTypes } from "@medusajs/framework/types"
import type { FetchError } from "@medusajs/js-sdk"
import { useQuery } from "@tanstack/react-query"
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query"

import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"

export const regionQueryKey = queryKeysFactory("regions")

interface RegionsResponse {
  regions: HttpTypes.AdminRegion[]
}

export const useRegions = (
  options?: Omit<
    UseQueryOptions<RegionsResponse, FetchError, RegionsResponse>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.region.list(),
    queryKey: regionQueryKey.list(),
    ...options,
  })

  return { ...data, ...rest }
}
