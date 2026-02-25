import type { HttpTypes } from "@medusajs/framework/types"
import type { FetchError } from "@medusajs/js-sdk"
import {
  type QueryKey,
  type UseQueryOptions,
  useQuery,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

export const orderPreviewQueryKey = queryKeysFactory("custom_orders")

export const useOrderPreview = (
  id: string,
  query?: HttpTypes.AdminOrderFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderPreviewResponse,
      FetchError,
      HttpTypes.AdminOrderPreviewResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.order.retrievePreview(id, query),
    queryKey: orderPreviewQueryKey.detail(id),
    ...options,
  })

  return { ...data, ...rest }
}
