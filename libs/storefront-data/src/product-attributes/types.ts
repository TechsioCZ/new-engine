import type { QueryResult, ReadResultBase } from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export type ProductAttributeInputType = "select" | "text"

export type ProductAttributeDefinition = {
  id: string
  key: string
  label: string
  input_type: ProductAttributeInputType
}

export type ProductAttributeOption = {
  id: string
  key: string
  label: string
}

export type ProductAttribute = {
  id: string
  definition: ProductAttributeDefinition
  option: ProductAttributeOption | null
  text_value: string | null
}

export type ProductAttributeListResponse = {
  count: number
  limit: number
  offset: number
  product_attributes: ProductAttribute[]
}

export type ProductAttributesInputBase = {
  productId?: null | string
  enabled?: boolean
}

export type ProductAttributeService<TAttribute, TParams> = {
  getProductAttributes: (
    params: TParams,
    signal?: AbortSignal
  ) => Promise<TAttribute[]>
}

export type ProductAttributeQueryKeys<TParams> = {
  detail: (params: TParams) => QueryKey
}

export type UseProductAttributesResult<TAttribute> = ReadResultBase<
  QueryResult<TAttribute[]>
> & {
  productAttributes: TAttribute[]
}
