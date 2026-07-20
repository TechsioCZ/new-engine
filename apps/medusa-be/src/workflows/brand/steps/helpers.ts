import type { Context, MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { ProductBrandLink } from "../../../links/product-brand"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import type { BrandAttributeInput } from "../types"
import {
  type BrandScalarWriteInput,
  normalizeBrandWriteInput,
} from "./validation"

export { getActiveBrandIds } from "../brand-activity"
export { getProductBrandIdsToReplace } from "./brand-link-state"

type BrandAttributeRecord = {
  id: string
  value: string
  attributeType?: {
    name: string
  }
}

type BrandSnapshot = {
  id: string
  title: string
  handle: string
  attributes: BrandAttributeInput[]
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
}

type BrandSnapshotRecord = {
  id: string
  title: string
  handle: string
  attributes: Array<
    BrandAttributeRecord & {
      attributeType: {
        id?: string
        name: string
      }
    }
  >
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean | null
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
}

type ProductBrandLinkRecord = {
  product_id?: string
  brand_id?: string
}

type BrandIdRecord = {
  id: string
}

const CHUNK_SIZE = 500

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

export const getBrandService = (container: MedusaContainer) =>
  container.resolve<BrandModuleService>(BRAND_MODULE)

export const withBrandTransaction = <T>(
  service: BrandModuleService,
  task: (sharedContext: Context) => Promise<T>
) => service.runInTransaction(task)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isBrandSnapshotRecord = (
  brand: unknown
): brand is BrandSnapshotRecord => {
  if (!isRecord(brand)) {
    return false
  }

  if (
    typeof brand.id !== "string" ||
    typeof brand.title !== "string" ||
    typeof brand.handle !== "string" ||
    !Array.isArray(brand.attributes) ||
    !(
      brand.gpsr_manufactured_outside_eu === undefined ||
      brand.gpsr_manufactured_outside_eu === null ||
      typeof brand.gpsr_manufactured_outside_eu === "boolean"
    )
  ) {
    return false
  }

  return brand.attributes.every((attribute) => {
    if (!isRecord(attribute) || typeof attribute.value !== "string") {
      return false
    }

    return (
      isRecord(attribute.attributeType) &&
      typeof attribute.attributeType.name === "string"
    )
  })
}

const assertBrandSnapshotRecord: (
  brand: unknown,
  brandId: string
) => asserts brand is BrandSnapshotRecord = (
  brand: unknown,
  brandId: string
) => {
  if (isBrandSnapshotRecord(brand)) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Brand "${brandId}" was retrieved without the fields required for a workflow snapshot`
  )
}

export const snapshotBrand = async (
  service: BrandModuleService,
  brandId: string,
  sharedContext: Context = {}
): Promise<BrandSnapshot> => {
  const brand = await service.retrieveBrand(
    brandId,
    {
      relations: ["attributes", "attributes.attributeType"],
    },
    sharedContext
  )

  assertBrandSnapshotRecord(brand, brandId)

  return {
    id: brand.id,
    title: brand.title,
    handle: brand.handle,
    attributes: brand.attributes.map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    })),
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
  }
}

const pickBrandWriteFields = (brand: BrandScalarWriteInput) => ({
  ...(brand.handle !== undefined ? { handle: brand.handle } : {}),
  ...(brand.title !== undefined ? { title: brand.title } : {}),
  ...(brand.gpsr_contact_email !== undefined
    ? { gpsr_contact_email: brand.gpsr_contact_email }
    : {}),
  ...(brand.gpsr_european_reseller_contact_email !== undefined
    ? {
        gpsr_european_reseller_contact_email:
          brand.gpsr_european_reseller_contact_email,
      }
    : {}),
  ...(brand.gpsr_european_reseller_manufacturing_company_name !== undefined
    ? {
        gpsr_european_reseller_manufacturing_company_name:
          brand.gpsr_european_reseller_manufacturing_company_name,
      }
    : {}),
  ...(brand.gpsr_european_reseller_postal_address !== undefined
    ? {
        gpsr_european_reseller_postal_address:
          brand.gpsr_european_reseller_postal_address,
      }
    : {}),
  ...(brand.gpsr_manufactured_outside_eu !== undefined
    ? { gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu }
    : {}),
  ...(brand.gpsr_manufacturing_company_name !== undefined
    ? { gpsr_manufacturing_company_name: brand.gpsr_manufacturing_company_name }
    : {}),
  ...(brand.gpsr_postal_address !== undefined
    ? { gpsr_postal_address: brand.gpsr_postal_address }
    : {}),
})

export const setBrandAttributes = async (
  service: BrandModuleService,
  brandId: string,
  inputAttributes: BrandAttributeInput[] = [],
  sharedContext: Context = {}
) => service.setBrandAttributes(brandId, inputAttributes, sharedContext)

export const buildBrandWriteInput = (brand: BrandScalarWriteInput) =>
  pickBrandWriteFields(normalizeBrandWriteInput(brand))

export const brandProductLink = (productId: string, brandId: string) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [BRAND_MODULE]: {
    brand_id: brandId,
  },
})

export const getProductBrandLockKeys = (productIds: string[]) => [
  "product-brand-relations",
  ...[...new Set(productIds)]
    .sort()
    .map((productId) => `product-brand:${productId}`),
]

export const getBrandMutationLockKeys = (brandIds: string[]) =>
  [...new Set(brandIds)].sort().map((brandId) => `brand:${brandId}`)

export const getBrandLifecycleLockKeys = (brandIds: string[]) => [
  "product-brand-relations",
  ...getBrandMutationLockKeys(brandIds),
]

export const getBrandAttributeTypeLockKeys = (namesOrIds: string[]) => [
  "brand-attribute-types",
  ...[...new Set(namesOrIds)]
    .sort()
    .map((value) => `brand-attribute-type:${value}`),
]

export const getBrandProductsLockKeys = (
  brandId: string,
  productIds: string[]
) => [`brand-products:${brandId}`, ...getProductBrandLockKeys(productIds)]

export const normalizeBrandProductDelta = (input: {
  add: string[]
  remove: string[]
}) => {
  const addProductIds = [...new Set(input.add)]
  const removeProductIds = [...new Set(input.remove)]
  const removeProductIdSet = new Set(removeProductIds)
  const overlappingProductIds = addProductIds.filter((productId) =>
    removeProductIdSet.has(productId)
  )

  if (overlappingProductIds.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ids cannot be added and removed in the same request: ${overlappingProductIds.join(", ")}`
    )
  }

  return {
    add: addProductIds,
    remove: removeProductIds,
  }
}

export const resolveBrandProductDelta = (
  currentProductIds: string[],
  input: {
    add: string[]
    remove: string[]
  }
) => {
  const delta = normalizeBrandProductDelta(input)
  const currentProductIdSet = new Set(currentProductIds)

  return {
    add: delta.add.filter((productId) => !currentProductIdSet.has(productId)),
    remove: delta.remove.filter((productId) =>
      currentProductIdSet.has(productId)
    ),
  }
}

export const partitionProductBrandConflicts = (
  links: Array<{ brand_id: string; product_id: string }>,
  activeBrandIds: Set<string>,
  targetBrandId: string
) => {
  const conflictingLinks = links.filter(
    (link) => link.brand_id !== targetBrandId
  )

  return {
    active: conflictingLinks.filter((link) =>
      activeBrandIds.has(link.brand_id)
    ),
    inactive: conflictingLinks.filter(
      (link) => !activeBrandIds.has(link.brand_id)
    ),
  }
}

export const getCurrentProductBrandIds = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["brand_id"],
    filters: {
      product_id: productId,
    },
  })

  return (data as ProductBrandLinkRecord[])
    .map((link) => link.brand_id)
    .filter((brandId): brandId is string => !!brandId)
}

export const getCurrentProductBrandLinks = async (
  container: MedusaContainer,
  productIds: string[]
) => {
  const ids = [...new Set(productIds)]

  if (!ids.length) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const data: ProductBrandLinkRecord[] = []

  for (const idChunk of chunkArray(ids, CHUNK_SIZE)) {
    const response = await query.graph({
      entity: ProductBrandLink.entryPoint,
      fields: ["product_id", "brand_id"],
      filters: {
        product_id: { $in: idChunk },
      },
    })

    data.push(...(response.data as ProductBrandLinkRecord[]))
  }

  return data.filter(
    (link): link is Required<ProductBrandLinkRecord> =>
      !!(link.product_id && link.brand_id)
  )
}

export const getExistingProductIds = async (
  container: MedusaContainer,
  productIds: string[]
) => {
  const ids = [...new Set(productIds)]

  if (!ids.length) {
    return new Set<string>()
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const products: BrandIdRecord[] = []

  for (const idChunk of chunkArray(ids, CHUNK_SIZE)) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: {
        id: { $in: idChunk },
      },
    })
    products.push(...(data as BrandIdRecord[]))
  }

  return new Set(products.map((product) => product.id))
}

export const diffIds = (currentIds: string[], nextIds: string[]) => {
  const current = new Set(currentIds)
  const next = new Set(nextIds)

  return {
    add: [...next].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !next.has(id)),
  }
}

export const hasActiveBrandConflict = (
  currentIds: string[],
  activeBrandIds: Set<string>,
  nextIds: string[]
) =>
  nextIds.length > 0 &&
  currentIds.some(
    (brandId) => activeBrandIds.has(brandId) && brandId !== nextIds[0]
  )

export const asArray = <T>(value: T | T[]) =>
  Array.isArray(value) ? value : [value]
