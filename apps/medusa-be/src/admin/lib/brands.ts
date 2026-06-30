import { sdk } from "./sdk"

export type BrandAttribute = {
  attribute_type_deleted_at?: string | null
  attribute_type_id?: string
  id?: string
  name: string
  value: string
}

export type BrandAttributeType = {
  deleted_at?: string | null
  id: string
  name: string
  usage_count: number
}

export type BrandAttributeTypeBrand = Brand & {
  attribute_value: string
}

export type Brand = {
  active_product_count: number
  id: string
  title: string
  handle: string
  attributes: BrandAttribute[]
  created_at?: string
  deleted_at?: string | null
  gpsrContactEmail?: string | null
  gpsrEuropeanResellerContactEmail?: string | null
  gpsrEuropeanResellerManufacturingCompanyName?: string | null
  gpsrEuropeanResellerPostalAddress?: string | null
  gpsrManufacturedOutsideEu?: boolean
  gpsrManufacturingCompanyName?: string | null
  gpsrPostalAddress?: string | null
  updated_at?: string
}

export type BrandInput = {
  title: string
  handle?: string
  attributes: BrandAttribute[]
  gpsrContactEmail?: string | null
  gpsrEuropeanResellerContactEmail?: string | null
  gpsrEuropeanResellerManufacturingCompanyName?: string | null
  gpsrEuropeanResellerPostalAddress?: string | null
  gpsrManufacturedOutsideEu?: boolean
  gpsrManufacturingCompanyName?: string | null
  gpsrPostalAddress?: string | null
}

export type ProductSummary = {
  id: string
  title?: string
  handle?: string
  thumbnail?: string | null
  status?: string
  created_at?: string
}

export type BrandProductOption = {
  assigned_brand?: Brand | null
  product: ProductSummary
}

export type BrandsResponse = {
  brands: Brand[]
  count: number
  limit: number
  offset: number
}

export type BrandResponse = {
  action?: "created" | "restored" | "updated"
  brand: Brand
}

export type BrandProductsResponse = {
  products: ProductSummary[]
  product_ids: string[]
  count: number
  limit?: number
  offset?: number
}

export type ProductBrandsResponse = {
  brands: Brand[]
  brand_ids: string[]
}

export type BrandAttributeTypesResponse = {
  attribute_types: BrandAttributeType[]
  count: number
  limit: number
  offset: number
}

export type BrandAttributeTypeResponse = {
  action?: "created" | "existing" | "restored"
  attribute_type: BrandAttributeType
}

export type BrandAttributeTypeDetailResponse = {
  attribute_type: BrandAttributeType
  brands: BrandAttributeTypeBrand[]
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

export type BrandProductOptionsResponse = {
  products: BrandProductOption[]
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

export const brandQueryKeys = {
  attributeTypeDetail: (
    id: string | undefined,
    params: Record<string, unknown>
  ) => ["brand-attribute-type", id, params] as const,
  attributeTypeDetailPrefix: (id: string | undefined) =>
    ["brand-attribute-type", id] as const,
  attributeTypeDetails: () => ["brand-attribute-type"] as const,
  attributeTypes: (params: Record<string, unknown>) =>
    ["brand-attribute-types", params] as const,
  attributeTypesLists: () => ["brand-attribute-types"] as const,
  detail: (id: string | undefined) => ["brand", id] as const,
  details: () => ["brand"] as const,
  list: (params: Record<string, unknown>) => ["brands", params] as const,
  lists: () => ["brands"] as const,
  productLinks: (productId: string | undefined) =>
    ["product-brands", productId] as const,
  productOptions: (id: string | undefined, params: Record<string, unknown>) =>
    ["brand-product-options", id, params] as const,
  productOptionsLists: () => ["brand-product-options"] as const,
  products: (id: string | undefined, params: Record<string, unknown>) =>
    ["brand-products", id, params] as const,
  productsLists: (id?: string) =>
    id ? (["brand-products", id] as const) : (["brand-products"] as const),
}

export const productQueryKeys = {
  list: (params: Record<string, unknown>) => ["products", params] as const,
}

export const listBrands = (params: {
  handle?: string
  include_deleted?: boolean
  limit: number
  offset: number
  order_by?: string
  q?: string
}) => sdk.client.fetch<BrandsResponse>(`/admin/brands?${toSearch(params)}`)

export const retrieveBrand = (id: string) =>
  sdk.client.fetch<BrandResponse>(`/admin/brands/${id}`)

export const createBrand = (input: BrandInput) =>
  sdk.client.fetch<BrandResponse>("/admin/brands", {
    body: input,
    method: "POST",
  })

export const updateBrand = (id: string, input: BrandInput) =>
  sdk.client.fetch<BrandResponse>(`/admin/brands/${id}`, {
    body: input,
    method: "POST",
  })

export const deleteBrand = (id: string) =>
  sdk.client.fetch(`/admin/brands/${id}`, {
    method: "DELETE",
  })

export const restoreBrand = (id: string) =>
  sdk.client.fetch<BrandResponse>(`/admin/brands/${id}`, {
    method: "PUT",
  })

export const listBrandAttributeTypes = (params: {
  include_deleted?: boolean
  limit: number
  name?: string
  offset: number
  order_by?: string
  q?: string
}) =>
  sdk.client.fetch<BrandAttributeTypesResponse>(
    `/admin/brands/attribute-types?${toSearch(params)}`
  )

export const retrieveBrandAttributeType = (
  id: string,
  params: {
    include_deleted?: boolean
    limit: number
    offset: number
    order_by?: string
    q?: string
  }
) =>
  sdk.client.fetch<BrandAttributeTypeDetailResponse>(
    `/admin/brands/attribute-types/${id}?${toSearch(params)}`
  )

export const createBrandAttributeType = (input: { name: string }) =>
  sdk.client.fetch<BrandAttributeTypeResponse>(
    "/admin/brands/attribute-types",
    {
      body: input,
      method: "POST",
    }
  )

export const deleteBrandAttributeType = (id: string) =>
  sdk.client.fetch<BrandAttributeTypeResponse>(
    `/admin/brands/attribute-types/${id}`,
    {
      method: "DELETE",
    }
  )

export const restoreBrandAttributeType = (id: string) =>
  sdk.client.fetch<BrandAttributeTypeResponse>(
    `/admin/brands/attribute-types/${id}`,
    {
      method: "POST",
    }
  )

export const retrieveProductBrands = (productId: string) =>
  sdk.client.fetch<ProductBrandsResponse>(`/admin/products/${productId}/brands`)

export const setProductBrands = (productId: string, brandId?: null | string) =>
  sdk.client.fetch<ProductBrandsResponse>(
    `/admin/products/${productId}/brands`,
    {
      // Keep the backend relation-replacement payload stable; cardinality is singular.
      body: {
        brand_ids: brandId ? [brandId] : [],
      },
      method: "POST",
    }
  )

export const retrieveBrandProducts = (
  brandId: string,
  params: { limit: number; offset: number; order_by?: string; q?: string }
) =>
  sdk.client.fetch<BrandProductsResponse>(
    `/admin/brands/${brandId}/products?${toSearch(params)}`
  )

export const retrieveBrandProductOptions = (
  brandId: string,
  params: { limit: number; offset: number; q?: string }
) =>
  sdk.client.fetch<BrandProductOptionsResponse>(
    `/admin/brands/${brandId}/product-options?${toSearch(params)}`
  )

export const setBrandProducts = (brandId: string, productIds: string[]) =>
  sdk.client.fetch<BrandProductsResponse>(`/admin/brands/${brandId}/products`, {
    body: {
      product_ids: productIds,
    },
    method: "POST",
  })

export const listProducts = (params: {
  fields?: string
  limit: number
  offset: number
  q?: string
}) => sdk.client.fetch<ProductsResponse>(`/admin/products?${toSearch(params)}`)
