import { getRecordValue } from "@techsio/std/object"

import { sdk } from "./sdk"

export type ProductAttributeInputType = "select" | "text"
export type ProductAttributeStatus = "active" | "all" | "deleted"

export interface ProductAttributeDefinition {
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

export interface ProductAttributeOption {
  created_at?: string
  definition_id: string
  deleted_at?: string | null
  id: string
  key: string
  label: string
  updated_at?: string
  usage_count: number
}

export interface ProductAttributeAssignedProduct {
  handle?: null | string
  id: string
  status?: null | string
  title?: null | string
  updated_at?: string
}

export interface ProductAttributeDetailItem {
  assignment: {
    id: string
    option_id: string | null
    text_value: string | null
  } | null
  definition: ProductAttributeDefinition
  selected_option: ProductAttributeOption | null
}

export interface ProductAttributeDefinitionsResponse {
  count: number
  definitions: ProductAttributeDefinition[]
  limit: number
  offset: number
}

export interface ProductAttributeDefinitionResponse {
  definition: ProductAttributeDefinition
}

export interface ProductAttributeOptionsResponse {
  count: number
  limit: number
  offset: number
  options: ProductAttributeOption[]
}

export interface ProductAttributeOptionResponse {
  option: ProductAttributeOption
}

export interface ProductAttributeAssignedProductsResponse {
  count: number
  limit: number
  offset: number
  products: ProductAttributeAssignedProduct[]
}

export interface ProductAttributesResponse {
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

const toSearch = (params: object) => {
  const search = new URLSearchParams()

  for (const key of Object.keys(params)) {
    const value = getRecordValue(params, key)
    if (
      typeof value === "boolean" ||
      typeof value === "number" ||
      (typeof value === "string" && value !== "")
    ) {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

interface ListProductAttributeDefinitionsParams {
  input_type?: ProductAttributeInputType
  is_public?: boolean
  limit: number
  offset: number
  order?: string
  q?: string
  status?: ProductAttributeStatus
}

interface ListProductAttributeOptionsParams {
  limit: number
  offset: number
  order?: string
  q?: string
  status?: ProductAttributeStatus
}

interface ListOptionAssignedProductsParams {
  limit: number
  offset: number
  order?: string
  q?: string
}

export const productAttributeQueryKeys = {
  definitionLists: () => ["product-attribute-definitions"] as const,
  definitions: (params: ListProductAttributeDefinitionsParams) =>
    ["product-attribute-definitions", params] as const,
  optionLists: (definitionId?: string) =>
    ["product-attribute-options", definitionId] as const,
  optionProducts: (
    optionId: string,
    params: ListOptionAssignedProductsParams,
  ) => ["product-attribute-option-products", optionId, params] as const,
  options: (definitionId: string, params: ListProductAttributeOptionsParams) =>
    ["product-attribute-options", definitionId, params] as const,
  product: (productId?: string) => ["product-attributes", productId] as const,
  products: () => ["product-attributes"] as const,
}

export const listProductAttributeDefinitions = async (
  params: ListProductAttributeDefinitionsParams,
) =>
  await sdk.client.fetch<ProductAttributeDefinitionsResponse>(
    `/admin/product-attributes/definitions?${toSearch(params)}`,
  )

export const createProductAttributeDefinition = async (input: {
  input_type: ProductAttributeInputType
  is_public: boolean
  key: string
  label: string
}) =>
  await sdk.client.fetch<ProductAttributeDefinitionResponse>(
    "/admin/product-attributes/definitions",
    { body: input, method: "POST" },
  )

export const updateProductAttributeDefinition = async (
  id: string,
  input: {
    input_type?: ProductAttributeInputType
    is_public?: boolean
    label?: string
  },
) =>
  await sdk.client.fetch<ProductAttributeDefinitionResponse>(
    `/admin/product-attributes/definitions/${id}`,
    { body: input, method: "POST" },
  )

export const deleteProductAttributeDefinition = async (id: string) =>
  await sdk.client.fetch(`/admin/product-attributes/definitions/${id}`, {
    method: "DELETE",
  })

export const permanentlyDeleteProductAttributeDefinition = async (id: string) =>
  await sdk.client.fetch(
    `/admin/product-attributes/definitions/${id}/permanent`,
    {
      method: "DELETE",
    },
  )

export const restoreProductAttributeDefinition = async (id: string) =>
  await sdk.client.fetch<ProductAttributeDefinitionResponse>(
    `/admin/product-attributes/definitions/${id}/restore`,
    { method: "POST" },
  )

export const listProductAttributeOptions = async (
  definitionId: string,
  params: ListProductAttributeOptionsParams,
) =>
  await sdk.client.fetch<ProductAttributeOptionsResponse>(
    `/admin/product-attributes/options?${toSearch({
      ...params,
      definition_id: definitionId,
    })}`,
  )

export const listProductAttributeOptionAssignedProducts = async (
  optionId: string,
  params: ListOptionAssignedProductsParams,
) =>
  await sdk.client.fetch<ProductAttributeAssignedProductsResponse>(
    `/admin/product-attributes/options/${optionId}/products?${toSearch(params)}`,
  )

export const createProductAttributeOption = async (
  definitionId: string,
  input: { key: string; label: string },
) =>
  await sdk.client.fetch<ProductAttributeOptionResponse>(
    `/admin/product-attributes/definitions/${definitionId}/options`,
    { body: input, method: "POST" },
  )

export const updateProductAttributeOption = async (
  id: string,
  input: { label: string },
) =>
  await sdk.client.fetch<ProductAttributeOptionResponse>(
    `/admin/product-attributes/options/${id}`,
    { body: input, method: "POST" },
  )

export const deleteProductAttributeOption = async (id: string) =>
  await sdk.client.fetch(`/admin/product-attributes/options/${id}`, {
    method: "DELETE",
  })

export const permanentlyDeleteProductAttributeOption = async (id: string) =>
  await sdk.client.fetch(`/admin/product-attributes/options/${id}/permanent`, {
    method: "DELETE",
  })

export const restoreProductAttributeOption = async (id: string) =>
  await sdk.client.fetch<ProductAttributeOptionResponse>(
    `/admin/product-attributes/options/${id}/restore`,
    { method: "POST" },
  )

export const retrieveProductAttributes = async (productId: string) =>
  await sdk.client.fetch<ProductAttributesResponse>(
    `/admin/products/${productId}/product-attributes`,
  )

export const setProductAttributes = async (
  productId: string,
  operations: SetProductAttributeOperation[],
) =>
  await sdk.client.fetch<ProductAttributesResponse>(
    `/admin/products/${productId}/product-attributes`,
    {
      body: { operations },
      method: "POST",
    },
  )
