import type {
  IProductModuleService,
  MedusaContainer,
  ProductTypes,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { ProductBrandLink } from "../../../links/product-brand"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"

export type BrandAttributeResponse = {
  attribute_type_id?: string
  attribute_type_deleted_at?: string | Date | null
  id?: string
  name: string
  value: string
}

export type BrandAttributeTypeResponse = {
  deleted_at?: string | Date | null
  id: string
  name: string
  usage_count: number
}

export type BrandAttributeTypeBrandResponse = BrandResponse & {
  attribute_value: string
}

export type BrandResponse = {
  active_product_count: number
  id: string
  title: string
  handle: string
  attributes: BrandAttributeResponse[]
  created_at?: string | Date
  deleted_at?: string | Date | null
  updated_at?: string | Date
}

export type BrandAttributeRecord = {
  id?: string
  value: string
  attributeType?: {
    deleted_at?: string | Date | null
    id?: string
    name?: string
  }
  attributeType_id?: string
  attribute_type_id?: string
  brand?: {
    active_product_count?: number
    attributes?: BrandAttributeRecord[]
    created_at?: string | Date
    deleted_at?: string | Date | null
    handle: string
    id?: string
    title: string
    updated_at?: string | Date
  }
  brand_id?: string
}

type BrandAttributeTypeRecord = {
  deleted_at?: string | Date | null
  id: string
  name: string
}

type BrandRecord = {
  id: string
  title: string
  handle: string
  attributes?: BrandAttributeRecord[]
  created_at?: string | Date
  deleted_at?: string | Date | null
  updated_at?: string | Date
}

type ProductRecord = Pick<ProductTypes.ProductDTO, "id"> &
  Partial<
    Pick<
      ProductTypes.ProductDTO,
      "created_at" | "handle" | "status" | "thumbnail" | "title" | "updated_at"
    >
  >

type LinkRecord = {
  deleted_at?: string | Date | null
  product_id?: string
  brand_id?: string
}

export type ProductBrandLinkRecord = Required<LinkRecord>

type BrandService = BrandModuleService & {
  createBrandAttributeTypes: (
    data:
      | { name: string }
      | {
          name: string
        }[]
  ) => Promise<BrandAttributeTypeRecord[]>
  listAndCountBrandAttributeTypes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[BrandAttributeTypeRecord[], number]>
  listBrandAttributes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<BrandAttributeRecord[]>
  listAndCountBrandAttributes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[BrandAttributeRecord[], number]>
  listBrands: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<BrandRecord[]>
  listAndCountBrands: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[BrandRecord[], number]>
  retrieveBrand: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<BrandRecord>
}

type ListProductsOptions = {
  order?: Record<string, "ASC" | "DESC">
  q?: string
  skip?: number
  take?: number
}

type RetrieveBrandOptions = {
  withDeleted?: boolean
}

const LIKE_WILDCARD_REGEX = /[\\%_]/g

export const getBrandService = (scope: MedusaContainer) =>
  scope.resolve<BrandService>(BRAND_MODULE)

const getProductService = (scope: MedusaContainer) =>
  scope.resolve<IProductModuleService>(Modules.PRODUCT)

export const toBrandResponse = (
  brand: BrandRecord,
  activeProductCount = 0
): BrandResponse => ({
  active_product_count: activeProductCount,
  attributes: (brand.attributes ?? []).flatMap((attribute) => {
    const name = attribute.attributeType?.name
    const attributeTypeId = attribute.attributeType?.id

    if (!(name && attributeTypeId)) {
      return []
    }

    return [
      {
        attribute_type_deleted_at: attribute.attributeType?.deleted_at ?? null,
        attribute_type_id: attributeTypeId,
        id: attribute.id,
        name,
        value: attribute.value,
      },
    ]
  }),
  created_at: brand.created_at,
  deleted_at: brand.deleted_at ?? null,
  handle: brand.handle,
  id: brand.id,
  title: brand.title,
  updated_at: brand.updated_at,
})

export const toBrandAttributeTypeResponse = (
  attributeType: BrandAttributeTypeRecord,
  usageCount: number
): BrandAttributeTypeResponse => ({
  deleted_at: attributeType.deleted_at ?? null,
  id: attributeType.id,
  name: attributeType.name,
  usage_count: usageCount,
})

export const toBrandAttributeTypeBrandResponse = (
  attribute: BrandAttributeRecord,
  activeProductCount = 0
): BrandAttributeTypeBrandResponse | null => {
  if (!attribute.brand?.id) {
    return null
  }

  const brand = {
    ...attribute.brand,
    id: attribute.brand.id,
  }

  return {
    ...toBrandResponse(brand, activeProductCount),
    attribute_value: attribute.value,
  }
}

export const getBrandAttributeTypeUsageCounts = async (
  scope: MedusaContainer,
  attributeTypeIds: string[]
) => {
  if (!attributeTypeIds.length) {
    return new Map<string, number>()
  }

  const attributes = await getBrandService(scope).listBrandAttributes(
    {
      attribute_type_id: { $in: attributeTypeIds },
    },
    {
      relations: ["brand"],
    }
  )

  const brandIdsByAttributeTypeId = new Map<string, Set<string>>()

  for (const attribute of attributes as BrandAttributeRecord[]) {
    const attributeTypeId =
      attribute.attribute_type_id ?? attribute.attributeType_id
    const brandId = attribute.brand?.id ?? attribute.brand_id

    if (!(attributeTypeId && brandId) || attribute.brand?.deleted_at) {
      continue
    }

    const brandIds =
      brandIdsByAttributeTypeId.get(attributeTypeId) ?? new Set<string>()
    brandIds.add(brandId)
    brandIdsByAttributeTypeId.set(attributeTypeId, brandIds)
  }

  return new Map(
    [...brandIdsByAttributeTypeId.entries()].map(
      ([attributeTypeId, brandIds]) => [attributeTypeId, brandIds.size]
    )
  )
}

export const getBrandActiveProductCounts = async (
  scope: MedusaContainer,
  brandIds: string[]
) => {
  if (!brandIds.length) {
    return new Map<string, number>()
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: links } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["brand_id", "product_id"],
    filters: {
      brand_id: { $in: brandIds },
    },
  })
  const productIds = uniqueIds(
    (links as LinkRecord[])
      .map((link) => link.product_id)
      .filter((productId): productId is string => !!productId)
  )

  if (!productIds.length) {
    return new Map<string, number>()
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: { $in: productIds },
      status: ProductStatus.PUBLISHED,
    },
  })
  const activeProductIds = new Set(
    (products as ProductRecord[]).map((product) => product.id)
  )
  const activeProductIdsByBrandId = new Map<string, Set<string>>()

  for (const link of links as LinkRecord[]) {
    if (!(link.brand_id && link.product_id)) {
      continue
    }

    if (!activeProductIds.has(link.product_id)) {
      continue
    }

    const productIdsForBrand =
      activeProductIdsByBrandId.get(link.brand_id) ?? new Set<string>()
    productIdsForBrand.add(link.product_id)
    activeProductIdsByBrandId.set(link.brand_id, productIdsForBrand)
  }

  return new Map(
    [...activeProductIdsByBrandId.entries()].map(
      ([brandId, activeIds]) => [brandId, activeIds.size]
    )
  )
}

export const toProductResponse = (product: ProductRecord) => ({
  created_at: product.created_at,
  handle: product.handle,
  id: product.id,
  status: product.status,
  thumbnail: product.thumbnail,
  title: product.title,
  updated_at: product.updated_at,
})

export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

export const uniqueIds = (ids: string[]) => [...new Set(ids)]

export const retrieveBrandOrThrow = async (
  scope: MedusaContainer,
  brandId: string,
  options: RetrieveBrandOptions = {}
) => {
  const [brand] = await getBrandService(scope).listBrands(
    {
      id: brandId,
    },
    {
      relations: ["attributes", "attributes.attributeType"],
      take: 1,
      withDeleted: options.withDeleted ?? false,
    }
  )

  if (!brand) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${brandId}" was not found`
    )
  }

  return brand
}

export const ensureBrandIdsExist = async (
  scope: MedusaContainer,
  brandIds: string[]
) => {
  const ids = uniqueIds(brandIds)

  if (!ids.length) {
    return ids
  }

  const brands = await getBrandService(scope).listBrands(
    {
      id: { $in: ids },
    },
    {
      select: ["id"],
      withDeleted: false,
    }
  )
  const found = new Set(brands.map((brand) => brand.id))
  const missing = ids.filter((id) => !found.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Brand ids were not found: ${missing.join(", ")}`
    )
  }

  return ids
}

export const getActiveBrandIds = async (
  scope: MedusaContainer,
  brandIds: string[]
) => {
  const ids = uniqueIds(brandIds)

  if (!ids.length) {
    return new Set<string>()
  }

  const brands = await getBrandService(scope).listBrands(
    {
      id: { $in: ids },
    },
    {
      select: ["id"],
      withDeleted: false,
    }
  )

  return new Set(brands.map((brand) => brand.id))
}

export const ensureProductIdsExist = async (
  scope: MedusaContainer,
  productIds: string[]
) => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return ids
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: { $in: ids },
    },
  })
  const found = new Set((data as ProductRecord[]).map((product) => product.id))
  const missing = ids.filter((id) => !found.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ids were not found: ${missing.join(", ")}`
    )
  }

  return ids
}

export const listProductBrandLinksByProductIds = async (
  scope: MedusaContainer,
  productIds: string[],
  options: { withDeleted?: boolean } = {}
): Promise<ProductBrandLinkRecord[]> => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return []
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["deleted_at", "product_id", "brand_id"],
    filters: {
      product_id: { $in: ids },
    },
    withDeleted: options.withDeleted,
  })

  return (data as LinkRecord[]).filter(
    (link): link is ProductBrandLinkRecord =>
      !!(link.product_id && link.brand_id)
  )
}

export const listProductBrandLinks = async (
  scope: MedusaContainer,
  options: { withDeleted?: boolean } = {}
): Promise<ProductBrandLinkRecord[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["deleted_at", "product_id", "brand_id"],
    withDeleted: options.withDeleted,
  })

  return (data as LinkRecord[]).filter(
    (link): link is ProductBrandLinkRecord =>
      !!(link.product_id && link.brand_id)
  )
}

export const ensureProductsAssignableToBrand = async (
  scope: MedusaContainer,
  brandId: string,
  productIds: string[]
) => {
  const links = await listProductBrandLinksByProductIds(scope, productIds)
  const linksToOtherBrands = links.filter(
    (link) => link.brand_id !== brandId
  )

  const activeBrandIds = await getActiveBrandIds(
    scope,
    linksToOtherBrands.map((link) => link.brand_id)
  )
  const conflictingLinks = linksToOtherBrands.filter((link) =>
    activeBrandIds.has(link.brand_id)
  )

  if (!conflictingLinks.length) {
    return
  }

  const brands = await listBrandsByIds(
    scope,
    uniqueIds(conflictingLinks.map((link) => link.brand_id))
  )
  const brandNamesById = new Map(
    brands.map((brand) => [brand.id, brand.title])
  )
  const conflictText = conflictingLinks
    .map((link) => {
      const brandName = brandNamesById.get(link.brand_id)
      return `${link.product_id}${brandName ? ` (${brandName})` : ""}`
    })
    .join(", ")

  throw new MedusaError(
    MedusaError.Types.CONFLICT,
    `Products are already linked to another brand: ${conflictText}`
  )
}

export const retrieveProductOrThrow = async (
  scope: MedusaContainer,
  productId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  const product = (data as ProductRecord[])[0]

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  return product
}

export const listBrandIdsForProduct = async (
  scope: MedusaContainer,
  productId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["brand_id"],
    filters: {
      product_id: productId,
    },
  })

  return (data as LinkRecord[])
    .map((link) => link.brand_id)
    .filter((brandId): brandId is string => !!brandId)
}

export const listProductIdsForBrand = async (
  scope: MedusaContainer,
  brandId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id"],
    filters: {
      brand_id: brandId,
    },
  })

  return (data as LinkRecord[])
    .map((link) => link.product_id)
    .filter((productId): productId is string => !!productId)
}

export const listBrandsByIds = async (
  scope: MedusaContainer,
  brandIds: string[]
) => {
  if (!brandIds.length) {
    return []
  }

  return getBrandService(scope).listBrands(
    {
      id: { $in: brandIds },
    },
    {
      order: {
        title: "ASC",
      },
      relations: ["attributes", "attributes.attributeType"],
      withDeleted: true,
    }
  )
}

export const listProductsByIds = async (
  scope: MedusaContainer,
  productIds: string[]
) => {
  if (!productIds.length) {
    return []
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status", "created_at"],
    filters: {
      id: { $in: productIds },
    },
  })

  return data as ProductRecord[]
}

export const listAndCountProducts = async (
  scope: MedusaContainer,
  filters: Record<string, unknown> = {},
  options: ListProductsOptions = {}
): Promise<[ProductRecord[], number]> => {
  const { order, q, skip, take } = options

  return getProductService(scope).listAndCountProducts(
    {
      ...filters,
      ...(q ? { q } : {}),
    },
    {
      order,
      select: ["id", "title", "handle", "thumbnail", "status", "created_at"],
      skip,
      take,
    }
  )
}

export const listAndCountProductsByIds = async (
  scope: MedusaContainer,
  productIds: string[],
  options: ListProductsOptions = {}
) => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return [[], 0] as [ProductRecord[], number]
  }

  return listAndCountProducts(
    scope,
    {
      id: { $in: ids },
    },
    options
  )
}
