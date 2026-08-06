import type {
  IProductModuleService,
  MedusaContainer,
  ProductTypes,
  Query,
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

type NullableTimestamp = string | Date | null

export interface BrandAttributeResponse {
  attribute_type_id?: string
  attribute_type_deleted_at?: NullableTimestamp
  id?: string | undefined
  name: string
  value: string
}

export interface BrandAttributeTypeResponse {
  deleted_at?: NullableTimestamp
  id: string
  name: string
  usage_count: number
}

export type BrandAttributeTypeBrandResponse = BrandResponse & {
  attribute_value: string
}

export interface BrandResponse {
  active_product_count: number
  id: string
  title: string
  handle: string
  attributes: BrandAttributeResponse[]
  created_at?: string | Date | undefined
  deleted_at?: NullableTimestamp
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
  updated_at?: string | Date | undefined
}

export interface BrandAttributeRecord {
  deleted_at?: NullableTimestamp
  id?: string
  value: string
  attributeType?: {
    deleted_at?: NullableTimestamp
    id?: string
    name?: string
  }
  attributeType_id?: string
  attribute_type_id?: string
  brand?: {
    active_product_count?: number
    attributes?: BrandAttributeRecord[]
    created_at?: string | Date
    deleted_at?: NullableTimestamp
    handle: string
    id?: string
    title: string
    updated_at?: string | Date
  }
  brand_id?: string
}

interface BrandAttributeTypeRecord {
  deleted_at?: NullableTimestamp
  id: string
  name: string
}

interface BrandRecord {
  id: string
  title: string
  handle: string
  attributes?: BrandAttributeRecord[]
  created_at?: string | Date
  deleted_at?: NullableTimestamp
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
  updated_at?: string | Date
}

type ProductRecord = Pick<ProductTypes.ProductDTO, "id"> &
  Partial<
    Pick<
      ProductTypes.ProductDTO,
      "created_at" | "handle" | "status" | "thumbnail" | "title" | "updated_at"
    >
  >

interface LinkRecord {
  deleted_at?: NullableTimestamp
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
        }[],
  ) => Promise<BrandAttributeTypeRecord[]>
  listAndCountBrandAttributeTypes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<[BrandAttributeTypeRecord[], number]>
  listBrandAttributes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<BrandAttributeRecord[]>
  listAndCountBrandAttributes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<[BrandAttributeRecord[], number]>
  listBrands: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<BrandRecord[]>
  listAndCountBrands: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<[BrandRecord[], number]>
  retrieveBrand: (
    id: string,
    config?: Record<string, unknown>,
  ) => Promise<BrandRecord>
}

interface ListProductsOptions {
  order?: Record<string, "ASC" | "DESC"> | undefined
  q?: string | undefined
  skip?: number | undefined
  take?: number | undefined
}

interface RetrieveBrandOptions {
  withDeleted?: boolean
}

const LIKE_WILDCARD_REGEX = /[\\%_]/gu
const QUERY_CHUNK_SIZE = 500

const chunkArray = <T>(items: T[], size = QUERY_CHUNK_SIZE) => {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

export const uniqueIds = (ids: string[]) => [...new Set(ids)]

const isPresentString = (value: string | undefined): value is string =>
  value !== undefined && value !== ""

const isPresentTimestamp = (
  value: NullableTimestamp | undefined,
): value is string | Date =>
  value !== null && value !== undefined && value !== ""

const isBrandQueryObjectLike = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const PRODUCT_STATUS_VALUES = new Set<string>(Object.values(ProductStatus))

const isProductStatus = (
  value: unknown,
): value is ProductTypes.ProductDTO["status"] =>
  typeof value === "string" && PRODUCT_STATUS_VALUES.has(value)

const toLinkRecord = (value: unknown): LinkRecord => {
  if (!isBrandQueryObjectLike(value)) {
    return {}
  }

  const deletedAt = value["deleted_at"]
  const productId = value["product_id"]
  const brandId = value["brand_id"]

  return {
    ...(deletedAt === null ||
    typeof deletedAt === "string" ||
    deletedAt instanceof Date
      ? { deleted_at: deletedAt }
      : {}),
    ...(typeof productId === "string" ? { product_id: productId } : {}),
    ...(typeof brandId === "string" ? { brand_id: brandId } : {}),
  }
}

const toLinkRecords = (value: unknown): LinkRecord[] =>
  Array.isArray(value) ? value.map((item) => toLinkRecord(item)) : []

const toProductRecord = (value: unknown): ProductRecord | null => {
  if (!isBrandQueryObjectLike(value)) {
    return null
  }

  const {
    created_at: createdAt,
    handle,
    id,
    status,
    thumbnail,
    title,
    updated_at: updatedAt,
  } = value

  if (typeof id !== "string") {
    return null
  }

  return {
    id,
    ...(typeof createdAt === "string" || createdAt instanceof Date
      ? { created_at: createdAt }
      : {}),
    ...(typeof handle === "string" ? { handle } : {}),
    ...(isProductStatus(status) ? { status } : {}),
    ...(thumbnail === null || typeof thumbnail === "string"
      ? { thumbnail }
      : {}),
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof updatedAt === "string" || updatedAt instanceof Date
      ? { updated_at: updatedAt }
      : {}),
  }
}

const toProductRecords = (value: unknown): ProductRecord[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const record = toProductRecord(item)

        return record ? [record] : []
      })
    : []

export const getBrandService = (scope: MedusaContainer) =>
  scope.resolve<BrandService>(BRAND_MODULE)

const getProductService = (scope: MedusaContainer) =>
  scope.resolve<IProductModuleService>(Modules.PRODUCT)

export const toBrandResponse = (
  brand: BrandRecord,
  activeProductCount = 0,
): BrandResponse => ({
  active_product_count: activeProductCount,
  attributes: (brand.attributes ?? []).flatMap((attribute) => {
    if (isPresentTimestamp(attribute.deleted_at)) {
      return []
    }

    const name = attribute.attributeType?.name
    const attributeTypeId = attribute.attributeType?.id

    if (!isPresentString(name) || !isPresentString(attributeTypeId)) {
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
  gpsr_contact_email: brand.gpsr_contact_email ?? null,
  gpsr_european_reseller_contact_email:
    brand.gpsr_european_reseller_contact_email ?? null,
  gpsr_european_reseller_manufacturing_company_name:
    brand.gpsr_european_reseller_manufacturing_company_name ?? null,
  gpsr_european_reseller_postal_address:
    brand.gpsr_european_reseller_postal_address ?? null,
  gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu ?? false,
  gpsr_manufacturing_company_name:
    brand.gpsr_manufacturing_company_name ?? null,
  gpsr_postal_address: brand.gpsr_postal_address ?? null,
  handle: brand.handle,
  id: brand.id,
  title: brand.title,
  updated_at: brand.updated_at,
})

export const toBrandAttributeTypeResponse = (
  attributeType: BrandAttributeTypeRecord,
  usageCount: number,
): BrandAttributeTypeResponse => ({
  deleted_at: attributeType.deleted_at ?? null,
  id: attributeType.id,
  name: attributeType.name,
  usage_count: usageCount,
})

export const toBrandAttributeTypeBrandResponse = (
  attribute: BrandAttributeRecord,
  activeProductCount = 0,
): BrandAttributeTypeBrandResponse | null => {
  if (attribute.brand === undefined || !isPresentString(attribute.brand.id)) {
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
  attributeTypeIds: string[],
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
    },
  )

  const brandIdsByAttributeTypeId = new Map<string, Set<string>>()

  for (const attribute of attributes as BrandAttributeRecord[]) {
    const attributeTypeId =
      attribute.attribute_type_id ?? attribute.attributeType_id
    const brandId = attribute.brand?.id ?? attribute.brand_id

    if (
      !isPresentString(attributeTypeId) ||
      !isPresentString(brandId) ||
      isPresentTimestamp(attribute.brand?.deleted_at)
    ) {
      continue
    }

    const brandIds =
      brandIdsByAttributeTypeId.get(attributeTypeId) ?? new Set<string>()
    brandIds.add(brandId)
    brandIdsByAttributeTypeId.set(attributeTypeId, brandIds)
  }

  return new Map(
    [...brandIdsByAttributeTypeId.entries()].map(
      ([attributeTypeId, brandIds]) => [attributeTypeId, brandIds.size],
    ),
  )
}

export const getBrandActiveProductCounts = async (
  scope: MedusaContainer,
  brandIds: string[],
) => {
  if (!brandIds.length) {
    return new Map<string, number>()
  }

  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const linkChunks = await Promise.all(
    chunkArray(uniqueIds(brandIds)).map(async (brandIdChunk) => {
      const { data } = await query.graph({
        entity: ProductBrandLink.entryPoint,
        fields: ["brand_id", "product_id"],
        filters: {
          brand_id: { $in: brandIdChunk },
        },
      })

      return toLinkRecords(data)
    }),
  )
  const links = linkChunks.flat()

  const productIds = uniqueIds(
    links
      .map((link) => link.product_id)
      .filter((productId): productId is string => isPresentString(productId)),
  )

  if (!productIds.length) {
    return new Map<string, number>()
  }

  const productChunks = await Promise.all(
    chunkArray(productIds).map(async (productIdChunk) => {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id"],
        filters: {
          id: { $in: productIdChunk },
          status: ProductStatus.PUBLISHED,
        },
      })

      return toProductRecords(data)
    }),
  )
  const products = productChunks.flat()

  const activeProductIds = new Set(products.map((product) => product.id))
  const activeProductIdsByBrandId = new Map<string, Set<string>>()

  for (const link of links) {
    if (
      !isPresentString(link.brand_id) ||
      !isPresentString(link.product_id) ||
      !activeProductIds.has(link.product_id)
    ) {
      continue
    }

    const productIdsForBrand =
      activeProductIdsByBrandId.get(link.brand_id) ?? new Set<string>()
    productIdsForBrand.add(link.product_id)
    activeProductIdsByBrandId.set(link.brand_id, productIdsForBrand)
  }

  return new Map(
    [...activeProductIdsByBrandId.entries()].map(([brandId, activeIds]) => [
      brandId,
      activeIds.size,
    ]),
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

export const retrieveBrandOrThrow = async (
  scope: MedusaContainer,
  brandId: string,
  options: RetrieveBrandOptions = {},
) => {
  const [brand] = await getBrandService(scope).listBrands(
    {
      id: brandId,
    },
    {
      relations: ["attributes", "attributes.attributeType"],
      take: 1,
      withDeleted: options.withDeleted ?? false,
    },
  )

  if (!brand) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${brandId}" was not found`,
    )
  }

  return brand
}

export const ensureProductIdsExist = async (
  scope: MedusaContainer,
  productIds: string[],
) => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return ids
  }

  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: { $in: ids },
    },
  })
  const found = new Set(toProductRecords(data).map((product) => product.id))
  const missing = ids.filter((id) => !found.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ids were not found: ${missing.join(", ")}`,
    )
  }

  return ids
}

export const listProductBrandLinksByProductIds = async (
  scope: MedusaContainer,
  productIds: string[],
  options: { withDeleted?: boolean } = {},
): Promise<ProductBrandLinkRecord[]> => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return []
  }

  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["deleted_at", "product_id", "brand_id"],
    filters: {
      product_id: { $in: ids },
    },
    ...(options.withDeleted === undefined
      ? {}
      : { withDeleted: options.withDeleted }),
  })

  return toLinkRecords(data).filter(
    (link): link is ProductBrandLinkRecord =>
      isPresentString(link.product_id) && isPresentString(link.brand_id),
  )
}

export const listProductBrandLinks = async (
  scope: MedusaContainer,
  options: { withDeleted?: boolean } = {},
): Promise<ProductBrandLinkRecord[]> => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["deleted_at", "product_id", "brand_id"],
    ...(options.withDeleted === undefined
      ? {}
      : { withDeleted: options.withDeleted }),
  })

  return toLinkRecords(data).filter(
    (link): link is ProductBrandLinkRecord =>
      isPresentString(link.product_id) && isPresentString(link.brand_id),
  )
}

export const retrieveProductOrThrow = async (
  scope: MedusaContainer,
  productId: string,
) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  const [product] = toProductRecords(data)

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`,
    )
  }

  return product
}

export const listBrandIdsForProduct = async (
  scope: MedusaContainer,
  productId: string,
) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["brand_id"],
    filters: {
      product_id: productId,
    },
  })

  return toLinkRecords(data)
    .map((link) => link.brand_id)
    .filter((brandId): brandId is string => isPresentString(brandId))
}

export const listProductIdsForBrand = async (
  scope: MedusaContainer,
  brandId: string,
) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id"],
    filters: {
      brand_id: brandId,
    },
  })

  return toLinkRecords(data)
    .map((link) => link.product_id)
    .filter((productId): productId is string => isPresentString(productId))
}

export const listBrandsByIds = async (
  scope: MedusaContainer,
  brandIds: string[],
) => {
  if (!brandIds.length) {
    return []
  }

  return await getBrandService(scope).listBrands(
    {
      id: { $in: brandIds },
    },
    {
      order: {
        title: "ASC",
      },
      relations: ["attributes", "attributes.attributeType"],
      withDeleted: true,
    },
  )
}

export const listProductsByIds = async (
  scope: MedusaContainer,
  productIds: string[],
) => {
  if (!productIds.length) {
    return []
  }

  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status", "created_at"],
    filters: {
      id: { $in: productIds },
    },
  })

  return toProductRecords(data)
}

export const listAndCountProducts = async (
  scope: MedusaContainer,
  filters: Record<string, unknown> = {},
  options: ListProductsOptions = {},
): Promise<[ProductRecord[], number]> => {
  const { order, q, skip, take } = options

  return await getProductService(scope).listAndCountProducts(
    {
      ...filters,
      ...(isPresentString(q) ? { q } : {}),
    },
    {
      select: ["id", "title", "handle", "thumbnail", "status", "created_at"],
      ...(order === undefined ? {} : { order }),
      ...(skip === undefined ? {} : { skip }),
      ...(take === undefined ? {} : { take }),
    },
  )
}

export const listAndCountProductsByIds = async (
  scope: MedusaContainer,
  productIds: string[],
  options: ListProductsOptions = {},
) => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return [[], 0] as [ProductRecord[], number]
  }

  return await listAndCountProducts(
    scope,
    {
      id: { $in: ids },
    },
    options,
  )
}
