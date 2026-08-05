import type { QueryResult, ReadResultBase } from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export interface ProductLocationAvailabilityLocation {
  location_id: string
  location_name: string
  available_quantity: number
}

export interface ProductVariantLocationAvailability {
  variant_id: string
  location_availability: ProductLocationAvailabilityLocation[]
}

export interface ProductLocationAvailabilityResponse {
  product_id: string
  variants: ProductVariantLocationAvailability[]
}

export interface ProductLocationAvailabilityInputBase {
  productId?: null | string
  enabled?: boolean
}

export interface ProductLocationAvailabilityService<TResponse, TParams> {
  getProductLocationAvailability: (
    params: TParams,
    signal?: AbortSignal,
  ) => Promise<TResponse>
}

export interface ProductLocationAvailabilityQueryKeys<TParams> {
  detail: (params: TParams) => QueryKey
}

export type UseProductLocationAvailabilityResult<TResponse> = ReadResultBase<
  QueryResult<TResponse>
> & {
  productLocationAvailability: null | TResponse
}
