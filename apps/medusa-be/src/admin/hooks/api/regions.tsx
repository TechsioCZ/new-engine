import type { HttpTypes } from "@medusajs/framework/types"
import type { FetchError } from "@medusajs/js-sdk"
import { useQuery } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"

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
  >,
) => {
  const query = useQuery({
    queryFn: async () => await sdk.admin.region.list(),
    queryKey: regionQueryKey.list(),
    ...options,
  })

  return { isPending: query.isPending, regions: query.data?.regions }
}
