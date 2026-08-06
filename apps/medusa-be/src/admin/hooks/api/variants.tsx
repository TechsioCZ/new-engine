import type { FetchError } from "@medusajs/js-sdk"
import { useQuery } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import { omitKeys } from "@techsio/std/object"

import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib/sdk"

const PRODUCT_VARIANT_QUERY_KEY = "product_variant" as const
export const productVariantQueryKeys = queryKeysFactory(
  PRODUCT_VARIANT_QUERY_KEY,
)

type ProductVariantListQuery = Parameters<
  typeof sdk.admin.productVariant.list
>[0]

type ProductVariantListResponse = Awaited<
  ReturnType<typeof sdk.admin.productVariant.list>
>

export const useVariants = (
  query?: ProductVariantListQuery,
  options?: Omit<
    UseQueryOptions<
      ProductVariantListResponse,
      FetchError,
      ProductVariantListResponse
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const queryResult = useQuery({
    queryFn: async () => await sdk.admin.productVariant.list(query),
    queryKey: productVariantQueryKeys.list(query),
    ...options,
  })

  return { ...queryResult.data, ...omitKeys(queryResult, ["data"]) }
}
