import type { QueryResult, ReadResultBase } from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export type ProductLocationAvailabilityLocation = {
  location_id: string
  location_name: string
  available_quantity: number
}

export type ProductVariantLocationAvailability = {
  variant_id: string
  location_availability: ProductLocationAvailabilityLocation[]
}

export type ProductLocationAvailabilityResponse = {
  product_id: string
  variants: ProductVariantLocationAvailability[]
}

export type ProductLocationAvailabilityInputBase = {
  productId?: null | string
  enabled?: boolean
}

export type ProductLocationAvailabilityService<
  TResponse,
  TParams,
> = {
  getProductLocationAvailability: (
    params: TParams,
    signal?: AbortSignal
  ) => Promise<TResponse>
}

export type ProductLocationAvailabilityQueryKeys<TParams> = {
  detail: (params: TParams) => QueryKey
}

export type UseProductLocationAvailabilityResult<TResponse> =
  ReadResultBase<QueryResult<TResponse>> & {
    productLocationAvailability: null | TResponse
  }
