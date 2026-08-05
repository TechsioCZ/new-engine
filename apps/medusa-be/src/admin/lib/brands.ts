import { queryKeysFactory } from "./query-key-factory"
import { sdk } from "./sdk"

export interface BrandAttribute {
  attribute_type_deleted_at?: string | null
  attribute_type_id?: string
  id?: string
  name: string
  value: string
}

export interface BrandAttributeType {
  deleted_at?: string | null
  id: string
  name: string
  usage_count: number
}

export type BrandAttributeTypeBrand = Brand & {
  attribute_value: string
}

export interface Brand {
  active_product_count: number
  id: string
  title: string
  handle: string
  attributes: BrandAttribute[]
  created_at?: string
  deleted_at?: string | null
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
  updated_at?: string
}

export interface BrandInput {
  title: string
  handle?: string | undefined
  attributes: BrandAttribute[]
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
}

export type BrandUpdateInput = Partial<BrandInput>

export interface ProductSummary {
  id: string
  title?: string
  handle?: string
  thumbnail?: string | null
  status?: string
  created_at?: string
}

export interface BrandProductOption {
  assigned_brand?: Brand | null
  product: ProductSummary
}

export interface BrandsResponse {
  brands: Brand[]
  count: number
  limit: number
  offset: number
}

export interface BrandResponse {
  brand: Brand
}

export interface BrandProductsResponse {
  products: ProductSummary[]
  product_ids: string[]
  count: number
  limit?: number
  offset?: number
}

export interface UpdateBrandProductsResponse {
  added: string[]
  removed: string[]
}

export interface UpdateBrandProductsInput {
  add: string[]
  remove: string[]
}

export interface ProductBrandsResponse {
  brands: Brand[]
  brand_ids: string[]
}

export interface BrandAttributeTypesResponse {
  attribute_types: BrandAttributeType[]
  count: number
  limit: number
  offset: number
}

export interface BrandAttributeTypeResponse {
  action?: "created" | "existing" | "restored"
  attribute_type: BrandAttributeType
}

export interface BrandAttributeTypeDetailResponse {
  attribute_type: BrandAttributeType
  brands: BrandAttributeTypeBrand[]
  count: number
  limit: number
  offset: number
}

export interface ProductsResponse {
  products: ProductSummary[]
  count: number
  limit: number
  offset: number
}

export interface BrandProductOptionsResponse {
  products: BrandProductOption[]
  count: number
  limit: number
  offset: number
}

const toSearch = (
  params: Record<string, boolean | number | string | undefined>,
) => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

const brandsQueryKeys = queryKeysFactory("brands")
const brandAttributeTypesQueryKeys = queryKeysFactory("brand-attribute-types")
const brandProductsQueryKeys = queryKeysFactory<
  "brand-products",
  Record<string, unknown>,
  string | undefined
>("brand-products")
const brandProductOptionsQueryKeys = queryKeysFactory<
  "brand-product-options",
  Record<string, unknown>,
  string | undefined
>("brand-product-options")
const productBrandsQueryKeys = queryKeysFactory<
  "product-brands",
  unknown,
  string | undefined
>("product-brands")

export const brandQueryKeys = {
  attributeTypeDetail: (
    id: string | undefined,
    params: Record<string, unknown>,
  ) => brandAttributeTypesQueryKeys.detail(id ?? "", params),
  attributeTypeDetailPrefix: (id: string | undefined) =>
    ["brand-attribute-types", "detail", id ?? ""] as const,
  attributeTypeDetails: () => brandAttributeTypesQueryKeys.details(),
  attributeTypes: (params: Record<string, unknown>) =>
    brandAttributeTypesQueryKeys.list(params),
  attributeTypesLists: () => brandAttributeTypesQueryKeys.lists(),
  detail: (id: string | undefined) => brandsQueryKeys.detail(id ?? ""),
  details: () => brandsQueryKeys.details(),
  list: (params: Record<string, unknown>) => brandsQueryKeys.list(params),
  lists: () => brandsQueryKeys.lists(),
  productLinks: (productId: string | undefined) =>
    productBrandsQueryKeys.detail(productId),
  productLinksDetails: () => productBrandsQueryKeys.details(),
  productOptions: (id: string | undefined, params: Record<string, unknown>) =>
    brandProductOptionsQueryKeys.detail(id, params),
  productOptionsLists: () => brandProductOptionsQueryKeys.details(),
  products: (id: string | undefined, params: Record<string, unknown>) =>
    brandProductsQueryKeys.detail(id, params),
  productsLists: (id?: string) =>
    id !== undefined && id !== ""
      ? (["brand-products", "detail", id] as const)
      : brandProductsQueryKeys.details(),
}

export const productQueryKeys = {
  detail: (id: string) => ["products", "detail", id] as const,
  details: () => ["products", "detail"] as const,
  list: (params: Record<string, unknown>) =>
    ["products", "list", { query: params }] as const,
  lists: () => ["products", "list"] as const,
}

export const listBrands = async (params: {
  handle?: string
  include_deleted?: boolean
  limit: number
  offset: number
  order_by?: string
  q?: string
}) =>
  await sdk.client.fetch<BrandsResponse>(`/admin/brands?${toSearch(params)}`)

export const retrieveBrand = async (id: string) =>
  await sdk.client.fetch<BrandResponse>(`/admin/brands/${id}`)

export const createBrand = async (input: BrandInput) =>
  await sdk.client.fetch<BrandResponse>("/admin/brands", {
    body: input,
    method: "POST",
  })

export const updateBrand = async (id: string, input: BrandUpdateInput) =>
  await sdk.client.fetch<BrandResponse>(`/admin/brands/${id}`, {
    body: input,
    method: "POST",
  })

export const deleteBrand = async (id: string) =>
  await sdk.client.fetch(`/admin/brands/${id}`, {
    method: "DELETE",
  })

export const restoreBrand = async (id: string) =>
  await sdk.client.fetch<BrandResponse>(`/admin/brands/${id}/restore`, {
    method: "POST",
  })

export const listBrandAttributeTypes = async (params: {
  include_deleted?: boolean
  limit: number
  name?: string
  offset: number
  order_by?: string
  q?: string
}) =>
  await sdk.client.fetch<BrandAttributeTypesResponse>(
    `/admin/brands/attribute-types?${toSearch(params)}`,
  )

export const retrieveBrandAttributeType = async (
  id: string,
  params: {
    include_deleted?: boolean
    limit: number
    offset: number
    order_by?: string
    q?: string
  },
) =>
  await sdk.client.fetch<BrandAttributeTypeDetailResponse>(
    `/admin/brands/attribute-types/${id}?${toSearch(params)}`,
  )

export const createBrandAttributeType = async (input: { name: string }) =>
  await sdk.client.fetch<BrandAttributeTypeResponse>(
    "/admin/brands/attribute-types",
    {
      body: input,
      method: "POST",
    },
  )

export const deleteBrandAttributeType = async (id: string) =>
  await sdk.client.fetch<BrandAttributeTypeResponse>(
    `/admin/brands/attribute-types/${id}`,
    {
      method: "DELETE",
    },
  )

export const restoreBrandAttributeType = async (id: string) =>
  await sdk.client.fetch<BrandAttributeTypeResponse>(
    `/admin/brands/attribute-types/${id}`,
    {
      method: "POST",
    },
  )

export const retrieveProductBrands = async (productId: string) =>
  await sdk.client.fetch<ProductBrandsResponse>(
    `/admin/products/${productId}/brands`,
  )

export const setProductBrands = async (
  productId: string,
  brandId?: null | string,
) =>
  await sdk.client.fetch<ProductBrandsResponse>(
    `/admin/products/${productId}/brands`,
    {
      // Keep the backend relation-replacement payload stable; cardinality is singular.
      body: {
        brand_ids:
          brandId !== undefined && brandId !== null && brandId !== ""
            ? [brandId]
            : [],
      },
      method: "POST",
    },
  )

export const retrieveBrandProducts = async (
  brandId: string,
  params: { limit: number; offset: number; order_by?: string; q?: string },
) =>
  await sdk.client.fetch<BrandProductsResponse>(
    `/admin/brands/${brandId}/products?${toSearch(params)}`,
  )

export const retrieveBrandProductOptions = async (
  brandId: string,
  params: { limit: number; offset: number; q?: string },
) =>
  await sdk.client.fetch<BrandProductOptionsResponse>(
    `/admin/brands/${brandId}/product-options?${toSearch(params)}`,
  )

export const updateBrandProducts = async (
  brandId: string,
  input: UpdateBrandProductsInput,
) =>
  await sdk.client.fetch<UpdateBrandProductsResponse>(
    `/admin/brands/${brandId}/products`,
    {
      body: input,
      method: "POST",
    },
  )

export const listProducts = async (params: {
  fields?: string
  limit: number
  offset: number
  q?: string
}) =>
  await sdk.client.fetch<ProductsResponse>(
    `/admin/products?${toSearch(params)}`,
  )
