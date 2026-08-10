import type { QueryResult, ReadResultBase } from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export type ProductAttributeInputType = "select" | "text"

export interface ProductAttributeDefinition {
  id: string
  key: string
  label: string
  input_type: ProductAttributeInputType
}

export interface ProductAttributeOption {
  id: string
  key: string
  label: string
}

export interface ProductAttribute {
  id: string
  definition: ProductAttributeDefinition
  option: ProductAttributeOption | null
  text_value: string | null
}

export interface ProductAttributeListResponse {
  count: number
  limit: number
  offset: number
  product_attributes: ProductAttribute[]
}

export interface ProductAttributesInputBase {
  productId?: null | string
  enabled?: boolean
}

export interface ProductAttributeService<TAttribute, TParams> {
  getProductAttributes: (
    params: TParams,
    signal?: AbortSignal,
  ) => Promise<TAttribute[]>
}

export interface ProductAttributeQueryKeys<TParams> {
  detail: (params: TParams) => QueryKey
}

export type UseProductAttributesResult<TAttribute> = ReadResultBase<
  QueryResult<TAttribute[]>
> & {
  productAttributes: TAttribute[]
}
