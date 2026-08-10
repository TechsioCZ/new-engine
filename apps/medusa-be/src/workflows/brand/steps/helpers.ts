import type { Context, MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { chunk } from "@techsio/std/array"

import { ProductBrandLink } from "../../../links/product-brand"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import type { BrandAttributeInput } from "../types"
import { normalizeBrandWriteInput } from "./validation"
import type { BrandScalarWriteInput } from "./validation"

export { getActiveBrandIds } from "../brand-activity"
export { getProductBrandIdsToReplace } from "./brand-link-state"

interface ProductBrandLinkFilters {
  brand_id?: string | { $in: string[] }
  product_id?: string | { $in: string[] }
}

interface BrandSnapshot {
  attributes: BrandAttributeInput[]
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
  handle: string
  id: string
  title: string
}

const CHUNK_SIZE = 500
const QUERY_CONCURRENCY = 4

const mapWithConcurrency = async <T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  offset = 0,
  results: R[] = [],
): Promise<R[]> => {
  if (offset >= items.length) {
    return results
  }
  const currentResults = await Promise.all(
    items
      .slice(offset, offset + QUERY_CONCURRENCY)
      .map(async (item) => await task(item)),
  )
  return await mapWithConcurrency(items, task, offset + QUERY_CONCURRENCY, [
    ...results,
    ...currentResults,
  ])
}

export const getBrandService = (container: MedusaContainer) =>
  container.resolve<BrandModuleService>(BRAND_MODULE)

export const withBrandTransaction = async <T>(
  service: BrandModuleService,
  task: (sharedContext: Context) => Promise<T>,
) => await service.runInTransaction(task)

const optionalNullableString = z.string().nullable().optional()
const brandSnapshotRecordSchema = z.object({
  attributes: z.array(
    z.object({
      attributeType: z.object({
        id: z.string().optional(),
        name: z.string(),
      }),
      id: z.string(),
      value: z.string(),
    }),
  ),
  gpsr_contact_email: optionalNullableString,
  gpsr_european_reseller_contact_email: optionalNullableString,
  gpsr_european_reseller_manufacturing_company_name: optionalNullableString,
  gpsr_european_reseller_postal_address: optionalNullableString,
  gpsr_manufactured_outside_eu: z.boolean().nullable().optional(),
  gpsr_manufacturing_company_name: optionalNullableString,
  gpsr_postal_address: optionalNullableString,
  handle: z.string(),
  id: z.string(),
  title: z.string(),
})
type BrandSnapshotRecord = z.infer<typeof brandSnapshotRecordSchema>
const graphDataSchema = z.object({ data: z.array(z.unknown()) })
const productBrandLinkSchema = z.object({
  brand_id: z.string().optional(),
  product_id: z.string().optional(),
})
type ProductBrandLinkRecord = z.infer<typeof productBrandLinkSchema>
interface CompleteProductBrandLinkRecord {
  brand_id: string
  product_id: string
}
const productIdSchema = z.object({ id: z.string() })

const parseBrandSnapshotRecord = (
  brand: unknown,
  brandId: string,
): BrandSnapshotRecord => {
  const parsed = brandSnapshotRecordSchema.safeParse(brand)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand "${brandId}" was retrieved without the fields required for a workflow snapshot`,
    )
  }
  return parsed.data
}

export const snapshotBrand = async (
  service: BrandModuleService,
  brandId: string,
  sharedContext: Context = {},
): Promise<BrandSnapshot> => {
  const brand = parseBrandSnapshotRecord(
    await service.retrieveBrand(
      brandId,
      {
        relations: ["attributes", "attributes.attributeType"],
      },
      sharedContext,
    ),
    brandId,
  )

  return {
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
    handle: brand.handle,
    id: brand.id,
    title: brand.title,
  }
}

const pickBrandWriteFields = (brand: BrandScalarWriteInput) => ({
  ...(brand.handle === undefined ? {} : { handle: brand.handle }),
  ...(brand.title === undefined ? {} : { title: brand.title }),
  ...(brand.gpsr_contact_email === undefined
    ? {}
    : { gpsr_contact_email: brand.gpsr_contact_email }),
  ...(brand.gpsr_european_reseller_contact_email === undefined
    ? {}
    : {
        gpsr_european_reseller_contact_email:
          brand.gpsr_european_reseller_contact_email,
      }),
  ...(brand.gpsr_european_reseller_manufacturing_company_name === undefined
    ? {}
    : {
        gpsr_european_reseller_manufacturing_company_name:
          brand.gpsr_european_reseller_manufacturing_company_name,
      }),
  ...(brand.gpsr_european_reseller_postal_address === undefined
    ? {}
    : {
        gpsr_european_reseller_postal_address:
          brand.gpsr_european_reseller_postal_address,
      }),
  ...(brand.gpsr_manufactured_outside_eu === undefined
    ? {}
    : { gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu }),
  ...(brand.gpsr_manufacturing_company_name === undefined
    ? {}
    : {
        gpsr_manufacturing_company_name: brand.gpsr_manufacturing_company_name,
      }),
  ...(brand.gpsr_postal_address === undefined
    ? {}
    : { gpsr_postal_address: brand.gpsr_postal_address }),
})

export const setBrandAttributes = async (
  service: BrandModuleService,
  brandId: string,
  inputAttributes: BrandAttributeInput[] = [],
  sharedContext: Context = {},
) => {
  await service.setBrandAttributes(brandId, inputAttributes, sharedContext)
}

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
    .toSorted()
    .map((productId) => `product-brand:${productId}`),
]

export const getBrandMutationLockKeys = (brandIds: string[]) =>
  [...new Set(brandIds)].toSorted().map((brandId) => `brand:${brandId}`)

export const getBrandLifecycleLockKeys = (brandIds: string[]) => [
  "product-brand-relations",
  ...getBrandMutationLockKeys(brandIds),
]

export const getBrandAttributeTypeLockKeys = (namesOrIds: string[]) => [
  "brand-attribute-types",
  ...[...new Set(namesOrIds)]
    .toSorted()
    .map((value) => `brand-attribute-type:${value}`),
]

export const getBrandProductsLockKeys = (
  brandId: string,
  productIds: string[],
) => [`brand-products:${brandId}`, ...getProductBrandLockKeys(productIds)]

export const normalizeBrandProductDelta = (input: {
  add: string[]
  remove: string[]
}) => {
  const addProductIds = [...new Set(input.add)]
  const removeProductIds = [...new Set(input.remove)]
  const removeProductIdSet = new Set(removeProductIds)
  const overlappingProductIds = addProductIds.filter((productId) =>
    removeProductIdSet.has(productId),
  )

  if (overlappingProductIds.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ids cannot be added and removed in the same request: ${overlappingProductIds.join(", ")}`,
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
  },
) => {
  const delta = normalizeBrandProductDelta(input)
  const currentProductIdSet = new Set(currentProductIds)

  return {
    add: delta.add.filter((productId) => !currentProductIdSet.has(productId)),
    remove: delta.remove.filter((productId) =>
      currentProductIdSet.has(productId),
    ),
  }
}

export const partitionProductBrandConflicts = (
  links: { brand_id: string; product_id: string }[],
  activeBrandIds: Set<string>,
  targetBrandId: string,
) => {
  const conflictingLinks = links.filter(
    (link) => link.brand_id !== targetBrandId,
  )

  return {
    active: conflictingLinks.filter((link) =>
      activeBrandIds.has(link.brand_id),
    ),
    inactive: conflictingLinks.filter(
      (link) => !activeBrandIds.has(link.brand_id),
    ),
  }
}

const getGraphData = (result: unknown, context: string): unknown[] => {
  const parsed = graphDataSchema.safeParse(result)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned invalid data`,
    )
  }
  return parsed.data.data
}

const parseProductBrandLink = (
  value: unknown,
  context: string,
): ProductBrandLinkRecord => {
  const parsed = productBrandLinkSchema.safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned an invalid link record`,
    )
  }
  return parsed.data
}

const queryProductBrandLinks = async (
  query: Query,
  filters: ProductBrandLinkFilters,
  context: string,
): Promise<ProductBrandLinkRecord[]> => {
  const result: unknown = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id", "brand_id"],
    filters,
  })

  return getGraphData(result, context).map((value) =>
    parseProductBrandLink(value, context),
  )
}

const queryProductBrandLinkChunks = async (
  query: Query,
  field: "brand_id" | "product_id",
  ids: string[],
): Promise<ProductBrandLinkRecord[]> => {
  const chunks = chunk(ids, CHUNK_SIZE)
  const responses = await mapWithConcurrency(
    chunks,
    async (idChunk) =>
      await queryProductBrandLinks(
        query,
        { [field]: { $in: idChunk } },
        `Product-brand ${field}`,
      ),
  )

  return responses.flat()
}

export const getCurrentProductBrandIds = async (
  container: MedusaContainer,
  productId: string,
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const links = await queryProductBrandLinks(
    query,
    { product_id: productId },
    "Product brands",
  )

  return links.flatMap((link) =>
    link.brand_id === undefined || link.brand_id.length === 0
      ? []
      : [link.brand_id],
  )
}

export const getCurrentProductBrandLinks = async (
  container: MedusaContainer,
  productIds: string[],
) => {
  const ids = [...new Set(productIds)]

  if (ids.length === 0) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const data = await queryProductBrandLinkChunks(query, "product_id", ids)

  return data.filter(
    (link): link is CompleteProductBrandLinkRecord =>
      link.product_id !== undefined &&
      link.product_id.length > 0 &&
      link.brand_id !== undefined &&
      link.brand_id.length > 0,
  )
}

export const getCurrentBrandProductLinks = async (
  container: MedusaContainer,
  brandIds: string[],
) => {
  const ids = [...new Set(brandIds)]

  if (ids.length === 0) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const data = await queryProductBrandLinkChunks(query, "brand_id", ids)

  return data.filter(
    (link): link is CompleteProductBrandLinkRecord =>
      link.product_id !== undefined &&
      link.product_id.length > 0 &&
      link.brand_id !== undefined &&
      link.brand_id.length > 0,
  )
}

export const getExistingProductIds = async (
  container: MedusaContainer,
  productIds: string[],
) => {
  const ids = [...new Set(productIds)]

  if (ids.length === 0) {
    return new Set<string>()
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const responses: unknown[] = await mapWithConcurrency(
    chunk(ids, CHUNK_SIZE),
    async (idChunk) =>
      await query.graph({
        entity: "product",
        fields: ["id"],
        filters: {
          id: { $in: idChunk },
        },
      }),
  )
  const productIdsFromQuery = responses.flatMap((response) =>
    getGraphData(response, "Products").map((product) => {
      const parsed = productIdSchema.safeParse(product)
      if (!parsed.success) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Products query returned an invalid record",
        )
      }
      return parsed.data.id
    }),
  )

  return new Set(productIdsFromQuery)
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
  nextIds: string[],
) =>
  nextIds.length > 0 &&
  currentIds.some(
    (brandId) => activeBrandIds.has(brandId) && brandId !== nextIds[0],
  )

export const asArray = <T>(value: T | T[]) =>
  Array.isArray(value) ? value : [value]
