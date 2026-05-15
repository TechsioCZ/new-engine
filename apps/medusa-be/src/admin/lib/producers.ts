import { sdk } from "./sdk"

export type ProducerAttribute = {
  attribute_type_deleted_at?: string | null
  attribute_type_id?: string
  id?: string
  name: string
  value: string
}

export type ProducerAttributeType = {
  deleted_at?: string | null
  id: string
  name: string
  usage_count: number
}

export type ProducerAttributeTypeProducer = Producer & {
  attribute_value: string
}

export type Producer = {
  active_product_count: number
  id: string
  title: string
  handle: string
  attributes: ProducerAttribute[]
  created_at?: string
  deleted_at?: string | null
  updated_at?: string
}

export type ProducerInput = {
  title: string
  handle?: string
  attributes: ProducerAttribute[]
}

export type ProductSummary = {
  id: string
  title?: string
  handle?: string
  thumbnail?: string | null
  status?: string
  created_at?: string
}

export type ProducerProductOption = {
  assigned_producer?: Producer | null
  product: ProductSummary
}

export type ProducersResponse = {
  producers: Producer[]
  count: number
  limit: number
  offset: number
}

export type ProducerResponse = {
  producer: Producer
}

export type ProducerProductsResponse = {
  products: ProductSummary[]
  product_ids: string[]
  count: number
  limit?: number
  offset?: number
}

export type ProductProducersResponse = {
  producers: Producer[]
  producer_ids: string[]
}

export type ProducerAttributeTypesResponse = {
  attribute_types: ProducerAttributeType[]
  count: number
  limit: number
  offset: number
}

export type ProducerAttributeTypeResponse = {
  action?: "created" | "existing" | "restored"
  attribute_type: ProducerAttributeType
}

export type ProducerAttributeTypeDetailResponse = {
  attribute_type: ProducerAttributeType
  producers: ProducerAttributeTypeProducer[]
  count: number
  limit: number
  offset: number
}

export type ProductsResponse = {
  products: ProductSummary[]
  count: number
  limit: number
  offset: number
}

export type ProducerProductOptionsResponse = {
  products: ProducerProductOption[]
  count: number
  limit: number
  offset: number
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

export const producerQueryKeys = {
  attributeTypeDetail: (
    id: string | undefined,
    params: Record<string, unknown>
  ) => ["producer-attribute-type", id, params] as const,
  attributeTypes: (params: Record<string, unknown>) =>
    ["producer-attribute-types", params] as const,
  detail: (id: string | undefined) => ["producer", id] as const,
  list: (params: Record<string, unknown>) => ["producers", params] as const,
  productLinks: (productId: string | undefined) =>
    ["product-producers", productId] as const,
  productOptions: (id: string | undefined, params: Record<string, unknown>) =>
    ["producer-product-options", id, params] as const,
  products: (id: string | undefined, params: Record<string, unknown>) =>
    ["producer-products", id, params] as const,
}

export const productQueryKeys = {
  list: (params: Record<string, unknown>) => ["products", params] as const,
}

export const listProducers = (params: {
  include_deleted?: boolean
  limit: number
  offset: number
  order_by?: string
  q?: string
}) =>
  sdk.client.fetch<ProducersResponse>(`/admin/producers?${toSearch(params)}`)

export const retrieveProducer = (id: string) =>
  sdk.client.fetch<ProducerResponse>(`/admin/producers/${id}`)

export const createProducer = (input: ProducerInput) =>
  sdk.client.fetch<ProducerResponse>("/admin/producers", {
    body: input,
    method: "POST",
  })

export const updateProducer = (id: string, input: ProducerInput) =>
  sdk.client.fetch<ProducerResponse>(`/admin/producers/${id}`, {
    body: input,
    method: "POST",
  })

export const deleteProducer = (id: string) =>
  sdk.client.fetch(`/admin/producers/${id}`, {
    method: "DELETE",
  })

export const restoreProducer = (id: string) =>
  sdk.client.fetch<ProducerResponse>(`/admin/producers/${id}`, {
    method: "PUT",
  })

export const listProducerAttributeTypes = (params: {
  include_deleted?: boolean
  limit: number
  name?: string
  offset: number
  order_by?: string
  q?: string
}) =>
  sdk.client.fetch<ProducerAttributeTypesResponse>(
    `/admin/producers/attribute-types?${toSearch(params)}`
  )

export const retrieveProducerAttributeType = (
  id: string,
  params: {
    include_deleted?: boolean
    limit: number
    offset: number
    order_by?: string
    q?: string
  }
) =>
  sdk.client.fetch<ProducerAttributeTypeDetailResponse>(
    `/admin/producers/attribute-types/${id}?${toSearch(params)}`
  )

export const createProducerAttributeType = (input: { name: string }) =>
  sdk.client.fetch<ProducerAttributeTypeResponse>(
    "/admin/producers/attribute-types",
    {
      body: input,
      method: "POST",
    }
  )

export const deleteProducerAttributeType = (id: string) =>
  sdk.client.fetch<ProducerAttributeTypeResponse>(
    `/admin/producers/attribute-types/${id}`,
    {
      method: "DELETE",
    }
  )

export const restoreProducerAttributeType = (id: string) =>
  sdk.client.fetch<ProducerAttributeTypeResponse>(
    `/admin/producers/attribute-types/${id}`,
    {
      method: "POST",
    }
  )

export const retrieveProductProducers = (productId: string) =>
  sdk.client.fetch<ProductProducersResponse>(
    `/admin/products/${productId}/producers`
  )

export const setProductProducers = (productId: string, producerIds: string[]) =>
  sdk.client.fetch<ProductProducersResponse>(
    `/admin/products/${productId}/producers`,
    {
      body: {
        producer_ids: producerIds,
      },
      method: "POST",
    }
  )

export const retrieveProducerProducts = (
  producerId: string,
  params: { limit: number; offset: number; order_by?: string; q?: string }
) =>
  sdk.client.fetch<ProducerProductsResponse>(
    `/admin/producers/${producerId}/products?${toSearch(params)}`
  )

export const retrieveProducerProductOptions = (
  producerId: string,
  params: { limit: number; offset: number; q?: string }
) =>
  sdk.client.fetch<ProducerProductOptionsResponse>(
    `/admin/producers/${producerId}/product-options?${toSearch(params)}`
  )

export const setProducerProducts = (producerId: string, productIds: string[]) =>
  sdk.client.fetch<ProducerProductsResponse>(
    `/admin/producers/${producerId}/products`,
    {
      body: {
        product_ids: productIds,
      },
      method: "POST",
    }
  )

export const listProducts = (params: {
  fields?: string
  limit: number
  offset: number
  q?: string
}) => sdk.client.fetch<ProductsResponse>(`/admin/products?${toSearch(params)}`)
