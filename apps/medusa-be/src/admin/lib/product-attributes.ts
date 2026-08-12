import { sdk } from "./sdk"

export type ProductAttributeInputType = "select" | "text"
export type ProductAttributeStatus = "active" | "all" | "deleted"

export type ProductAttributeDefinition = {
  created_at?: string
  deleted_at?: string | null
  id: string
  input_type: ProductAttributeInputType
  is_public: boolean
  key: string
  label: string
  updated_at?: string
  usage_count: number
}

export type ProductAttributeOption = {
  created_at?: string
  definition_id: string
  deleted_at?: string | null
  id: string
  key: string
  label: string
  updated_at?: string
  usage_count: number
}

export type ProductAttributeAssignedProduct = {
  handle?: null | string
  id: string
  status?: null | string
  title?: null | string
  updated_at?: string
}

export type ProductAttributeDetailItem = {
  assignment: {
    id: string
    option_id: string | null
    text_value: string | null
  } | null
  definition: ProductAttributeDefinition
  selected_option: ProductAttributeOption | null
}

export type ProductAttributeDefinitionsResponse = {
  count: number
  definitions: ProductAttributeDefinition[]
  limit: number
  offset: number
}

export type ProductAttributeDefinitionResponse = {
  definition: ProductAttributeDefinition
}

export type ProductAttributeOptionsResponse = {
  count: number
  limit: number
  offset: number
  options: ProductAttributeOption[]
}

export type ProductAttributeOptionResponse = {
  option: ProductAttributeOption
}

export type ProductAttributeAssignedProductsResponse = {
  count: number
  limit: number
  offset: number
  products: ProductAttributeAssignedProduct[]
}

export type ProductAttributesResponse = {
  product_attributes: ProductAttributeDetailItem[]
}

export type SetProductAttributeOperation =
  | {
      action: "remove"
      definition_id: string
    }
  | {
      action: "set"
      definition_id: string
      option_id: string
    }
  | {
      action: "set"
      definition_id: string
      text_value: string
    }

const toSearch = (
  params: Record<string, boolean | number | string | undefined>
) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

export const productAttributeQueryKeys = {
  definitionLists: () => ["product-attribute-definitions"] as const,
  definitions: (params: Record<string, unknown>) =>
    ["product-attribute-definitions", params] as const,
  optionLists: (definitionId?: string) =>
    ["product-attribute-options", definitionId] as const,
  options: (definitionId: string, params: Record<string, unknown>) =>
    ["product-attribute-options", definitionId, params] as const,
  optionProducts: (optionId: string, params: Record<string, unknown>) =>
    ["product-attribute-option-products", optionId, params] as const,
  products: () => ["product-attributes"] as const,
  product: (productId?: string) => ["product-attributes", productId] as const,
}

export const listProductAttributeDefinitions = (params: {
  input_type?: ProductAttributeInputType
  is_public?: boolean
  limit: number
  offset: number
  order?: string
  q?: string
  status?: ProductAttributeStatus
}) =>
  sdk.client.fetch<ProductAttributeDefinitionsResponse>(
    `/admin/product-attributes/definitions?${toSearch(params)}`
  )

export const createProductAttributeDefinition = (input: {
  input_type: ProductAttributeInputType
  is_public: boolean
  key: string
  label: string
}) =>
  sdk.client.fetch<ProductAttributeDefinitionResponse>(
    "/admin/product-attributes/definitions",
    { body: input, method: "POST" }
  )

export const updateProductAttributeDefinition = (
  id: string,
  input: {
    input_type?: ProductAttributeInputType
    is_public?: boolean
    label?: string
  }
) =>
  sdk.client.fetch<ProductAttributeDefinitionResponse>(
    `/admin/product-attributes/definitions/${id}`,
    { body: input, method: "POST" }
  )

export const deleteProductAttributeDefinition = (id: string) =>
  sdk.client.fetch(`/admin/product-attributes/definitions/${id}`, {
    method: "DELETE",
  })

export const permanentlyDeleteProductAttributeDefinition = (id: string) =>
  sdk.client.fetch(`/admin/product-attributes/definitions/${id}/permanent`, {
    method: "DELETE",
  })

export const restoreProductAttributeDefinition = (id: string) =>
  sdk.client.fetch<ProductAttributeDefinitionResponse>(
    `/admin/product-attributes/definitions/${id}/restore`,
    { method: "POST" }
  )

export const listProductAttributeOptions = (
  definitionId: string,
  params: {
    limit: number
    offset: number
    order?: string
    q?: string
    status?: ProductAttributeStatus
  }
) =>
  sdk.client.fetch<ProductAttributeOptionsResponse>(
    `/admin/product-attributes/options?${toSearch({
      ...params,
      definition_id: definitionId,
    })}`
  )

export const listProductAttributeOptionAssignedProducts = (
  optionId: string,
  params: {
    limit: number
    offset: number
    order?: string
    q?: string
  }
) =>
  sdk.client.fetch<ProductAttributeAssignedProductsResponse>(
    `/admin/product-attributes/options/${optionId}/products?${toSearch(params)}`
  )

export const createProductAttributeOption = (
  definitionId: string,
  input: { key: string; label: string }
) =>
  sdk.client.fetch<ProductAttributeOptionResponse>(
    `/admin/product-attributes/definitions/${definitionId}/options`,
    { body: input, method: "POST" }
  )

export const updateProductAttributeOption = (
  id: string,
  input: { label: string }
) =>
  sdk.client.fetch<ProductAttributeOptionResponse>(
    `/admin/product-attributes/options/${id}`,
    { body: input, method: "POST" }
  )

export const deleteProductAttributeOption = (id: string) =>
  sdk.client.fetch(`/admin/product-attributes/options/${id}`, {
    method: "DELETE",
  })

export const permanentlyDeleteProductAttributeOption = (id: string) =>
  sdk.client.fetch(`/admin/product-attributes/options/${id}/permanent`, {
    method: "DELETE",
  })

export const restoreProductAttributeOption = (id: string) =>
  sdk.client.fetch<ProductAttributeOptionResponse>(
    `/admin/product-attributes/options/${id}/restore`,
    { method: "POST" }
  )

export const retrieveProductAttributes = (productId: string) =>
  sdk.client.fetch<ProductAttributesResponse>(
    `/admin/products/${productId}/product-attributes`
  )

export const setProductAttributes = (
  productId: string,
  operations: SetProductAttributeOperation[]
) =>
  sdk.client.fetch<ProductAttributesResponse>(
    `/admin/products/${productId}/product-attributes`,
    {
      body: { operations },
      method: "POST",
    }
  )
