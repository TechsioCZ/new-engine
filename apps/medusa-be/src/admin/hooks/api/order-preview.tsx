import type { HttpTypes } from "@medusajs/framework/types"
import type { FetchError } from "@medusajs/js-sdk"
import { useQuery } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"

import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"

export const orderPreviewQueryKey = queryKeysFactory("custom_orders")

export interface OrderPreviewResult {
  isLoading: boolean
  order: HttpTypes.AdminOrderPreviewResponse["order"] | undefined
}

export const useOrderPreview = (
  id: string,
  query?: HttpTypes.AdminOrderFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderPreviewResponse,
      FetchError,
      HttpTypes.AdminOrderPreviewResponse
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, isLoading } = useQuery({
    queryFn: async () => await sdk.admin.order.retrievePreview(id, query),
    queryKey: orderPreviewQueryKey.detail(id),
    ...options,
  })

  return {
    isLoading,
    order: data?.order,
  } satisfies OrderPreviewResult
}
